import { type HTMLElement, parse } from 'node-html-parser'
import { lookup } from 'node:dns/promises'
import http, { type IncomingMessage } from 'node:http'
import https from 'node:https'
import net from 'node:net'

// Ported from react-email's checkLinks / checkImages (packages/ui/src/actions/email-validation).
// Runs against the rendered HTML; reports only non-success results, error-first.

// Cap the body we'll read when sizing an image, so a hostile/huge src can't OOM us.
const MAX_IMAGE_BYTES = 5_242_880

/** True for loopback / private / link-local / unique-local addresses (SSRF guard). */
export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number)
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 169 && b === 254) return true // link-local (incl. cloud metadata 169.254.169.254)
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    return false
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase()
    if (v === '::1' || v === '::') return true
    if (v.startsWith('fe80') || v.startsWith('fc') || v.startsWith('fd')) return true
    // IPv4-mapped (::ffff:a.b.c.d)
    const mapped = v.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isPrivateAddress(mapped[1])
    return false
  }
  return false
}

/**
 * Rejects URLs that aren't plain http(s) or that resolve to a private/loopback
 * address — the linter fetches arbitrary URLs from rendered email source, so
 * without this it would be an SSRF gadget against internal/metadata endpoints.
 */
export async function assertFetchable(url: URL): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Unsupported URL scheme: ${url.protocol}`)
  }
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (net.isIP(host)) {
    if (isPrivateAddress(host)) throw new Error('Refusing to fetch a private address')
    return
  }
  const results = await lookup(host, { all: true })
  if (results.some(({ address }) => isPrivateAddress(address))) {
    throw new Error('Refusing to fetch a private address')
  }
}

export type CheckStatus = 'success' | 'warning' | 'error'

export interface LintRow {
  source: 'link' | 'image'
  status: 'warning' | 'error'
  type: string
  message: string
  target: string
  metadata: string[]
  line: number
}

async function quickFetch(url: URL): Promise<IncomingMessage> {
  await assertFetchable(url)
  return new Promise((resolve, reject) => {
    const caller = url.protocol === 'https:' ? https : http
    const req = caller.get(url, { headers: { 'user-agent': 'vuemailer-linter' } }, resolve)
    req.on('error', reject)
    req.setTimeout(8000, () => req.destroy(new Error('Request timed out')))
  })
}

/**
 * Builds a line-lookup over `html` once (O(n)) so per-link/per-image lookups are
 * O(log n) binary search instead of slicing+splitting the whole string each time.
 */
function makeLineAt(html: string): (offset: number) => number {
  const lineStarts = [0]
  for (let i = 0; i < html.length; i++) {
    if (html.charCodeAt(i) === 10) lineStarts.push(i + 1)
  }
  return (offset: number): number => {
    let lo = 0
    let hi = lineStarts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (lineStarts[mid] <= offset) lo = mid
      else hi = mid - 1
    }
    return lo + 1
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

interface Check {
  type: 'syntax' | 'security' | 'fetch_attempt' | 'accessibility' | 'image_size'
  passed: boolean
  fetchStatusCode?: number
  byteCount?: number
}

interface CheckResult {
  source: 'link' | 'image'
  status: CheckStatus
  target: string
  line: number
  checks: Check[]
}

async function checkLink(
  anchor: HTMLElement,
  lineAt: (offset: number) => number,
): Promise<CheckResult | undefined> {
  const link = anchor.attributes.href
  if (!link || link.startsWith('mailto:')) return undefined

  const result: CheckResult = {
    source: 'link',
    status: 'success',
    target: link,
    line: lineAt(anchor.range[0]),
    checks: [],
  }

  try {
    const url = new URL(link)
    result.checks.push({ type: 'syntax', passed: true })

    if (link.startsWith('http://')) {
      result.checks.push({ type: 'security', passed: false })
      result.status = 'warning'
    } else {
      result.checks.push({ type: 'security', passed: true })
    }

    try {
      const res = await quickFetch(url)
      const code = res.statusCode
      const ok = code?.toString().startsWith('2') ?? false
      res.resume()
      result.checks.push({ type: 'fetch_attempt', passed: ok, fetchStatusCode: code })
      if (!ok) result.status = code?.toString().startsWith('3') ? 'warning' : 'error'
    } catch {
      result.checks.push({ type: 'fetch_attempt', passed: false })
      result.status = 'error'
    }
  } catch {
    result.checks.push({ type: 'syntax', passed: false })
    result.status = 'error'
  }

  return result
}

async function checkImage(
  image: HTMLElement,
  lineAt: (offset: number) => number,
  base: string,
): Promise<CheckResult | undefined> {
  const rawSource = image.attributes.src
  if (!rawSource) return undefined
  const source = rawSource.startsWith('/') ? `${base}${rawSource}` : rawSource

  const result: CheckResult = {
    source: 'image',
    status: 'success',
    target: rawSource,
    line: lineAt(image.range[0]),
    checks: [],
  }

  const alt = image.attributes.alt
  result.checks.push({ type: 'accessibility', passed: alt !== undefined })
  if (alt === undefined) result.status = 'warning'

  try {
    const url = new URL(source)
    result.checks.push({ type: 'syntax', passed: true })

    if (rawSource.startsWith('http://')) {
      result.checks.push({ type: 'security', passed: false })
      result.status = 'warning'
    } else {
      result.checks.push({ type: 'security', passed: true })
    }

    try {
      const res = await quickFetch(url)
      const code = res.statusCode
      const ok = code?.toString().startsWith('2') ?? false
      result.checks.push({ type: 'fetch_attempt', passed: ok, fetchStatusCode: code })
      if (!ok) result.status = code?.toString().startsWith('3') ? 'warning' : 'error'

      let bytes = 0
      for await (const chunk of res) {
        bytes += (chunk as Buffer).byteLength
        if (bytes > MAX_IMAGE_BYTES) {
          res.destroy()
          break
        }
      }
      result.checks.push({ type: 'image_size', passed: bytes < 1_048_576, byteCount: bytes })
      if (bytes > 1_048_576 && result.status !== 'error') result.status = 'warning'
    } catch {
      result.checks.push({ type: 'fetch_attempt', passed: false })
      result.status = 'error'
    }
  } catch {
    result.checks.push({ type: 'syntax', passed: false })
    result.status = 'error'
  }

  return result
}

const LINK_MESSAGES: Record<string, (code?: number) => string> = {
  security: () => 'Insecure URL, use HTTPS instead of HTTP',
  syntax: () => 'The link is broken due to invalid syntax',
  fetch_attempt: (code) =>
    code === undefined
      ? 'The link could not be reached'
      : code >= 300 && code < 400
        ? 'There was a redirect, the content may have been moved'
        : 'The link is broken',
}

const IMAGE_MESSAGES: Record<string, (code?: number) => string> = {
  accessibility: () => 'Missing alt text',
  security: () => 'Insecure URL, use HTTPS instead of HTTP',
  syntax: () => 'The image is broken due to an invalid source',
  image_size: () => 'This image is too large, keep it under 1mb',
  fetch_attempt: (code) =>
    code === undefined
      ? 'The image could not be reached'
      : code >= 300 && code < 400
        ? 'There was a redirect, the image may have been moved'
        : 'The image is broken',
}

function toRow(result: CheckResult): LintRow | undefined {
  if (result.status === 'success') return undefined
  const failing = result.checks.find((c) => !c.passed)
  if (!failing) return undefined

  const metadata: string[] = []
  for (const check of result.checks) {
    if (check.type === 'image_size' && check.byteCount) metadata.push(formatBytes(check.byteCount))
    if (check.type === 'fetch_attempt' && check.fetchStatusCode) {
      metadata.push(`HTTP ${check.fetchStatusCode}`)
    }
  }

  const messages = result.source === 'link' ? LINK_MESSAGES : IMAGE_MESSAGES
  return {
    source: result.source,
    status: result.status,
    type: failing.type,
    message: messages[failing.type]?.(failing.fetchStatusCode) ?? failing.type,
    target: result.target,
    metadata,
    line: result.line,
  }
}

export async function lintEmail(html: string, base: string): Promise<LintRow[]> {
  const ast = parse(html)
  const lineAt = makeLineAt(html)
  const [links, images] = await Promise.all([
    Promise.all(ast.querySelectorAll('a').map((a) => checkLink(a, lineAt))),
    Promise.all(ast.querySelectorAll('img').map((img) => checkImage(img, lineAt, base))),
  ])

  const rows = [...links, ...images]
    .filter((r): r is CheckResult => r !== undefined)
    .map(toRow)
    .filter((r): r is LintRow => r !== undefined)

  rows.sort((a, b) => (a.status === b.status ? 0 : a.status === 'error' ? -1 : 1))
  return rows
}
