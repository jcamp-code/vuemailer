import { parse } from 'parse5'

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

const collapseWhitespace = (text: string) => text.replace(/\s+/g, ' ').trim()

function normalizeStyle(value: string): string {
  return value
    .split(';')
    .map((decl) => decl.trim())
    .filter(Boolean)
    .map((decl) => {
      const index = decl.indexOf(':')
      if (index === -1) return decl.toLowerCase()
      const prop = decl.slice(0, index).trim().toLowerCase()
      const val = decl
        .slice(index + 1)
        .trim()
        .toLowerCase()
        .replace(/\s*,\s*/g, ',')
        .replace(/\s+/g, ' ')
      return `${prop}:${val}`
    })
    .sort()
    .join(';')
}

function normalizeAttrValue(name: string, value: string): string {
  if (name === 'style') return normalizeStyle(value)
  if (name === 'class') return value.trim().split(/\s+/).filter(Boolean).sort().join(' ')
  return collapseWhitespace(value)
}

interface P5Node {
  nodeName: string
  tagName?: string
  value?: string
  data?: string
  attrs?: Array<{ name: string; value: string }>
  childNodes?: P5Node[]
}

function serializeNode(node: P5Node): string {
  switch (node.nodeName) {
    case '#text': {
      return collapseWhitespace(node.value ?? '')
    }
    case '#comment': {
      const data = collapseWhitespace(node.data ?? '')
      // Keep only conditional comments (`[if mso]>`, `[if !mso]>`, ...) — the
      // only semantically meaningful comments in email. Everything else is
      // framework noise: React's <!--$-->/<!--html-->/<!--body--> markers and
      // Vue's empty <!----> slot placeholders.
      if (data.startsWith('[')) return `<!--${data}-->`
      return ''
    }
    case '#documentType': {
      return '' // ignore the doctype; both renderers emit the same one
    }
    default: {
      const tag = (node.tagName ?? node.nodeName).toLowerCase()
      const attrs = (node.attrs ?? [])
        // `data-id` is an invisible internal marker (e.g. on Column); its value
        // differs by design between the libraries, so don't count it.
        .filter((a) => a.name.toLowerCase() !== 'data-id')
        .map((a) => ({ name: a.name.toLowerCase(), value: a.value }))
        .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
        .map((a) => `${a.name}="${normalizeAttrValue(a.name, a.value)}"`)
        .join(' ')
      const open = attrs ? `<${tag} ${attrs}>` : `<${tag}>`
      if (VOID_ELEMENTS.has(tag)) return open
      return `${open}${serializeChildren(node.childNodes)}</${tag}>`
    }
  }
}

function serializeChildren(nodes: P5Node[] | undefined): string {
  if (!nodes) return ''
  return nodes
    .map(serializeNode)
    .filter((part) => part.length > 0)
    .join('')
}

/**
 * Parses HTML and re-serializes it in a canonical form so that cosmetic
 * differences (attribute order, style/class declaration order, color spacing,
 * inter-tag whitespace, casing) don't register as differences. What remains
 * are real structural/semantic divergences.
 */
export function canonicalize(html: string): string {
  const document = parse(html) as unknown as P5Node
  return serializeChildren(document.childNodes)
}

/** Splits a canonical string into one tag/text token per line for readable diffs. */
export function tokenizeForDiff(canonical: string): string[] {
  return canonical
    .replace(/></g, '>\n<')
    .replace(/(>)([^<\n])/g, '$1\n$2')
    .replace(/([^>\n])(<)/g, '$1\n$2')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}
