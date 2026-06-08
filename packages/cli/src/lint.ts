import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { allCssProperties } from './all-css-properties'

// ---------------------------------------------------------------------------
// caniemail data (full dataset, read at runtime — see copy-data.mjs)
// ---------------------------------------------------------------------------

type RawStats = Record<string, Record<string, Record<string, string>>>

interface SupportEntry {
  slug: string
  title: string
  category: 'html' | 'css' | 'image' | 'others'
  url: string
  keywords: string | null
  notes_by_num: Record<number, string> | null
  stats: RawStats
}

interface RawData {
  nicenames: { family: Record<string, string> }
  last_update_date: string
  data: SupportEntry[]
}

const dataPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'caniemail.json')
const data = JSON.parse(readFileSync(dataPath, 'utf8')) as RawData

// react-email's default relevant clients (overridable there via env; we mirror the default).
export const RELEVANT_CLIENTS = ['gmail', 'apple-mail', 'outlook', 'yahoo'] as const

// Harmless attributes we never surface: `target="_blank"` on links is universal
// and carries no real deliverability/rendering risk, so the warning is just noise.
const SUPPRESSED_ATTRIBUTES = new Set(['target'])

// Document/table scaffolding every HTML email must use — flagging these isn't
// actionable, so findings on them are tagged `structural` and hidden by default.
const STRUCTURAL_ELEMENTS = new Set([
  'html',
  'head',
  'body',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'td',
  'th',
  'style',
])

// ---------------------------------------------------------------------------
// Entry → detector classification (ported verbatim from react-email's
// packages/ui/src/utils/caniemail/*)
// ---------------------------------------------------------------------------

const propertyWithValueRegex =
  /(?<propertyName>[a-z-]+)\s*:\s*(?<propertyValue>[a-zA-Z\-0-9()+*/_ ]+)/

function getCssPropertyWithValue(title: string): { name: string; value: string } | undefined {
  const match = propertyWithValueRegex.exec(title.trim())
  if (match?.groups) return { name: match.groups.propertyName!, value: match.groups.propertyValue! }
  return undefined
}

function getCssFunctions(title: string): string[] {
  const t = title.trim()
  if (/^[a-zA-Z]\(\)$/.test(t)) return [t.replace('()', '')]
  if (/^(?:[^(),]+?\(\),?)*$/.test(t)) {
    return t.split(/\s*,\s*/).map((fn) => fn.replace('()', ''))
  }
  if (/^CSS [a-z]+\(\) function$/.test(t)) {
    return [t.replace('CSS ', '').replace(' function', '').replace('()', '')]
  }
  return []
}

function getCssUnit(title: string): string | undefined {
  return title.endsWith(' unit') ? title.replace(' unit', '') : undefined
}

function getCssPropertyNames(title: string, keywords: string | null): string[] {
  if (allCssProperties.includes(title.replace(' property', ''))) {
    return [title.replace(' property', '')]
  }
  if (title.split('&').length > 1) {
    return title
      .split(/\s*&\s*/)
      .map((p) => p.trim())
      .filter((p) => allCssProperties.includes(p))
  }
  if (title.split(',').length > 1) {
    return title
      .split(/\s*,\s*/)
      .map((p) => p.trim())
      .filter((p) => allCssProperties.includes(p))
  }
  if (keywords) {
    return keywords.split(/\s*,\s*/).filter((k) => allCssProperties.includes(k))
  }
  return []
}

function getElementNames(title: string, keywords: string | null): string[] {
  const match = /<(?<elementName>[^>]*)> element/.exec(title)
  if (match?.groups?.elementName) return [match.groups.elementName.toLowerCase()]
  if (keywords && keywords.length > 0) {
    return keywords
      .toLowerCase()
      .split(/\s*,\s*/)
      .map((p) => p.trim())
  }
  if (title.split(',').length > 1) {
    return title
      .toLowerCase()
      .split(/\s*,\s*/)
      .map((p) => p.trim())
  }
  return []
}

function getElementAttributes(title: string): string[] {
  return title.endsWith(' attribute') ? [title.replace(' attribute', '')] : []
}

// ---------------------------------------------------------------------------
// Status per entry (ported from getCompatibilityStatsForEntry)
// ---------------------------------------------------------------------------

export type SupportStatus = 'success' | 'warning' | 'error'

interface EntryStats {
  status: SupportStatus
  perClient: Partial<Record<string, SupportStatus>>
}

function getEntryStats(entry: SupportEntry): EntryStats {
  const result: EntryStats = { status: 'success', perClient: {} }
  for (const client of RELEVANT_CLIENTS) {
    const rawStats = entry.stats[client]
    if (!rawStats) continue
    let clientStatus: SupportStatus = 'success'
    for (const versions of Object.values(rawStats)) {
      const entries = Object.entries(versions)
      const latest = entries[entries.length - 1]
      if (!latest) continue
      const code = String(latest[1])
      if (code.startsWith('u')) continue
      if (code.startsWith('a')) {
        if (clientStatus === 'success') clientStatus = 'warning'
        if (result.status === 'success') result.status = 'warning'
      } else if (code.startsWith('n')) {
        clientStatus = 'error'
        result.status = 'error'
      }
    }
    result.perClient[client] = clientStatus
  }
  return result
}

// ---------------------------------------------------------------------------
// Usage extraction from the rendered HTML
// ---------------------------------------------------------------------------

interface Declaration {
  name: string
  value: string
  line: number
}

interface Usage {
  declarations: Declaration[]
  // name → 1-based line of its first occurrence in the (pretty-printed) HTML.
  elements: Map<string, number>
  attributes: Map<string, number>
}

/** Returns a fn mapping a 0-based string index to its 1-based line number. */
function makeLineAt(html: string): (index: number) => number {
  const starts = [0]
  for (let i = 0; i < html.length; i++) {
    if (html.charCodeAt(i) === 10) starts.push(i + 1)
  }
  return (index) => {
    let lo = 0
    let hi = starts.length - 1
    let ans = 0
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (starts[mid]! <= index) {
        ans = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }
    return ans + 1
  }
}

function extractUsage(html: string): Usage {
  const declarations: Declaration[] = []
  const elements = new Map<string, number>()
  const attributes = new Map<string, number>()
  const lineAt = makeLineAt(html)

  const addDecl = (raw: string, line: number) => {
    const index = raw.indexOf(':')
    if (index === -1) return
    const name = raw.slice(0, index).trim().toLowerCase()
    const value = raw
      .slice(index + 1)
      .trim()
      .toLowerCase()
    if (name && value) declarations.push({ name, value, line })
  }

  for (const m of html.matchAll(/\sstyle="([^"]*)"/gi)) {
    const line = lineAt(m.index)
    for (const decl of m[1]!.split(';')) addDecl(decl, line)
  }
  for (const sm of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    const css = sm[1]!
    const cssStart = sm.index + sm[0].indexOf(css)
    for (const bm of css.matchAll(/\{([^}]*)\}/g)) {
      const line = lineAt(cssStart + bm.index)
      for (const decl of bm[1]!.split(';')) addDecl(decl, line)
    }
  }
  for (const m of html.matchAll(/<([a-z][a-z0-9]*)\b/gi)) {
    const name = m[1]!.toLowerCase()
    if (!elements.has(name)) elements.set(name, lineAt(m.index))
  }
  for (const m of html.matchAll(/\s([a-z][a-z0-9-]*)\s*=\s*["']/gi)) {
    const name = m[1]!.toLowerCase()
    if (!attributes.has(name)) attributes.set(name, lineAt(m.index))
  }

  return { declarations, elements, attributes }
}

// ---------------------------------------------------------------------------
// Linting
// ---------------------------------------------------------------------------

export interface LintFinding {
  slug: string
  title: string
  category: string
  url: string
  perClient: Partial<Record<string, SupportStatus>>
  /** Document/table scaffolding every email must use — hidden by default in the UI. */
  structural: boolean
  /** 1-based line in the rendered (pretty-printed) HTML where this feature first appears. */
  line: number
}

/** True when the entry is for an always-harmless attribute we never surface (e.g. target). */
function isSuppressedEntry(entry: SupportEntry): boolean {
  if (entry.category !== 'html') return false
  const attributes = getElementAttributes(entry.title)
  return attributes.length > 0 && attributes.every((attr) => SUPPRESSED_ATTRIBUTES.has(attr))
}

/** True when the entry targets only unavoidable HTML scaffolding (body, table, td, style, …). */
function isStructuralEntry(entry: SupportEntry): boolean {
  if (entry.category !== 'html') return false
  const elements = getElementNames(entry.title, entry.keywords)
  return elements.length > 0 && elements.every((el) => STRUCTURAL_ELEMENTS.has(el))
}

export interface LintResult {
  checkedFeatures: number
  issueCount: number
  findings: LintFinding[]
  nicenames: Record<string, string>
  lastUpdate: string
  clients: readonly string[]
}

/** Returns the line where `entry` is first used in `usage`, or null if it isn't used. */
function matchEntryLine(entry: SupportEntry, usage: Usage): number | null {
  if (entry.category === 'html') {
    const elements = getElementNames(entry.title, entry.keywords)
    if (elements.length > 0) {
      let best: number | null = null
      for (const el of elements) {
        const line = usage.elements.get(el)
        if (line !== undefined && (best === null || line < best)) best = line
      }
      return best
    }
    const attributes = getElementAttributes(entry.title)
    if (attributes.length > 0) {
      let best: number | null = null
      for (const attr of attributes) {
        const line = usage.attributes.get(attr)
        if (line !== undefined && (best === null || line < best)) best = line
      }
      return best
    }
    return null
  }

  if (entry.category === 'css') {
    const fullProperty = getCssPropertyWithValue(entry.title)
    const functions = getCssFunctions(entry.title)
    const unit = getCssUnit(entry.title)
    const propertyNames = getCssPropertyNames(entry.title, entry.keywords).map((p) =>
      p.toLowerCase(),
    )

    let match: Declaration | undefined
    if (fullProperty?.name && fullProperty.value) {
      const name = fullProperty.name.toLowerCase()
      const value = fullProperty.value.trim().toLowerCase()
      match = usage.declarations.find((d) => d.name === name && d.value === value)
    } else if (functions.length > 0) {
      match = usage.declarations.find((d) => {
        const fn = /(?<name>[a-zA-Z_][a-zA-Z0-9_-]*)\s*\(/.exec(d.value)?.groups?.name
        return fn !== undefined && functions.includes(fn)
      })
    } else if (unit) {
      match = usage.declarations.find((d) => {
        const m = /[0-9](?<unit>[a-zA-Z%]+)$/.exec(d.value.trim())
        return m?.groups?.unit === unit
      })
    } else if (propertyNames.length > 0) {
      match = usage.declarations.find((d) => propertyNames.includes(d.name))
    }
    if (match) return match.line
  }

  return null
}

export function lintHtml(html: string): LintResult {
  const usage = extractUsage(html)
  const findings: LintFinding[] = []
  let checkedFeatures = 0

  for (const entry of data.data) {
    // Always-harmless features (e.g. target attribute) are never surfaced.
    if (isSuppressedEntry(entry)) continue
    const stats = getEntryStats(entry)
    // Skip features with no data for relevant clients.
    if (Object.keys(stats.perClient).length === 0) continue
    const line = matchEntryLine(entry, usage)
    if (line === null) continue
    checkedFeatures++
    // react-email surfaces only hard incompatibilities (skip success + warning).
    if (stats.status !== 'error') continue
    findings.push({
      slug: entry.slug,
      title: entry.title,
      category: entry.category,
      url: entry.url,
      perClient: stats.perClient,
      structural: isStructuralEntry(entry),
      line,
    })
  }

  findings.sort((a, b) => a.title.localeCompare(b.title))

  return {
    checkedFeatures,
    issueCount: findings.length,
    findings,
    nicenames: data.nicenames.family,
    lastUpdate: data.last_update_date,
    clients: RELEVANT_CLIENTS,
  }
}
