import type { CSSProperties, PropType, VNode } from 'vue'

import { marked, Renderer } from 'marked'
import { defineComponent, h } from 'vue'

export type StylesType = Partial<
  Record<
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6'
    | 'blockQuote'
    | 'bold'
    | 'italic'
    | 'link'
    | 'codeBlock'
    | 'codeInline'
    | 'p'
    | 'li'
    | 'ul'
    | 'ol'
    | 'image'
    | 'br'
    | 'hr'
    | 'table'
    | 'thead'
    | 'tbody'
    | 'tr'
    | 'th'
    | 'td'
    | 'strikethrough',
    CSSProperties
  >
>

const baseHeaderStyles: CSSProperties = { fontWeight: '500', paddingTop: 20 }
const codeInline: CSSProperties = {
  color: '#212529',
  fontSize: '87.5%',
  display: 'inline',
  background: ' #f8f8f8',
  fontFamily: 'SFMono-Regular,Menlo,Monaco,Consolas,monospace',
}

const styles: StylesType = {
  h1: { ...baseHeaderStyles, fontSize: '2.5rem' },
  h2: { ...baseHeaderStyles, fontSize: '2rem' },
  h3: { ...baseHeaderStyles, fontSize: '1.75rem' },
  h4: { ...baseHeaderStyles, fontSize: '1.5rem' },
  h5: { ...baseHeaderStyles, fontSize: '1.25rem' },
  h6: { ...baseHeaderStyles, fontSize: '1rem' },
  blockQuote: {
    background: '#f9f9f9',
    borderLeft: '10px solid #ccc',
    margin: '1.5em 10px',
    padding: '1em 10px',
  },
  bold: { fontWeight: 'bold' },
  italic: { fontStyle: 'italic' },
  link: { color: '#007bff', textDecoration: 'underline', backgroundColor: 'transparent' },
  codeInline: { ...codeInline, wordWrap: 'break-word' },
  codeBlock: {
    ...codeInline,
    display: 'block',
    paddingTop: 10,
    paddingRight: 10,
    paddingLeft: 10,
    paddingBottom: 1,
    marginBottom: 20,
    wordWrap: 'break-word',
  },
}

const numericalCssProperties = new Set([
  'width',
  'height',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderWidth',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'outlineWidth',
  'top',
  'right',
  'bottom',
  'left',
  'fontSize',
  'letterSpacing',
  'wordSpacing',
  'maxWidth',
  'minWidth',
  'maxHeight',
  'minHeight',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'textIndent',
  'gridColumnGap',
  'gridRowGap',
  'gridGap',
  'translateX',
  'translateY',
])

const camelToKebabCase = (str: string): string =>
  str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

// Markdown output is assigned via innerHTML, so all interpolated content must be
// escaped for the context it lands in (HTML text, double-quoted attribute, or URL).
const htmlEscape = (value: unknown): string =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** Allow only safe URL schemes; neutralize `javascript:`/`vbscript:`/`data:` etc. */
const safeUrl = (url: string): string => {
  const trimmed = url.trim()
  // Relative URLs and anchors are fine; for absolute URLs require a known-safe scheme.
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    if (!/^(?:https?|mailto|tel):/i.test(trimmed)) return '#'
  }
  return htmlEscape(trimmed)
}

const escapeQuotes = (value: unknown): unknown =>
  typeof value === 'string' && value.includes('"') ? value.replace(/"/g, '&quot;') : value

function parseCssInJsToInlineCss(cssProperties: CSSProperties | undefined): string {
  if (!cssProperties) return ''
  return Object.entries(cssProperties)
    .map(([property, value]) => {
      if (typeof value === 'number' && numericalCssProperties.has(property)) {
        return `${camelToKebabCase(property)}:${value}px`
      }
      return `${camelToKebabCase(property)}:${escapeQuotes(value)}`
    })
    .join(';')
}

const styleAttr = (css: CSSProperties | undefined): string => {
  const inline = parseCssInJsToInlineCss(css)
  return inline !== '' ? ` style="${inline}"` : ''
}

function createRenderer(custom?: StylesType): Renderer {
  const finalStyles: StylesType = { ...styles, ...custom }
  const renderer = new Renderer()

  renderer.blockquote = ({ tokens }) =>
    `<blockquote${styleAttr(finalStyles.blockQuote)}>\n${renderer.parser.parse(tokens)}</blockquote>\n`

  renderer.br = () => `<br${styleAttr(finalStyles.br)} />`

  renderer.code = ({ text }) =>
    `<pre${styleAttr(finalStyles.codeBlock)}><code>${htmlEscape(`${text.replace(/\n$/, '')}\n`)}</code></pre>\n`

  renderer.codespan = ({ text }) =>
    `<code${styleAttr(finalStyles.codeInline)}>${htmlEscape(text)}</code>`

  renderer.del = ({ tokens }) =>
    `<del${styleAttr(finalStyles.strikethrough)}>${renderer.parser.parseInline(tokens)}</del>`

  renderer.em = ({ tokens }) =>
    `<em${styleAttr(finalStyles.italic)}>${renderer.parser.parseInline(tokens)}</em>`

  renderer.heading = ({ tokens, depth }) => {
    const text = renderer.parser.parseInline(tokens)
    return `<h${depth}${styleAttr(finalStyles[`h${depth}` as keyof StylesType])}>${text}</h${depth}>`
  }

  renderer.hr = () => `<hr${styleAttr(finalStyles.hr)} />\n`

  renderer.image = ({ href, text, title }) =>
    `<img src="${safeUrl(href)}" alt="${htmlEscape(text)}"${
      title ? ` title="${htmlEscape(title)}"` : ''
    }${styleAttr(finalStyles.image)}>`

  renderer.link = ({ href, title, tokens }) =>
    `<a href="${safeUrl(href)}" target="_blank"${title ? ` title="${htmlEscape(title)}"` : ''}${styleAttr(
      finalStyles.link,
    )}>${renderer.parser.parseInline(tokens)}</a>`

  renderer.listitem = ({ tokens, loose }) => {
    const hasNestedList = tokens.some((token) => token.type === 'list')
    const text =
      loose || hasNestedList ? renderer.parser.parse(tokens) : renderer.parser.parseInline(tokens)
    return `<li${styleAttr(finalStyles.li)}>${text}</li>\n`
  }

  renderer.list = ({ items, ordered, start }) => {
    const type = ordered ? 'ol' : 'ul'
    const startAt = ordered && start !== 1 ? ` start="${start}"` : ''
    return `<${type}${startAt}${styleAttr(finalStyles[ordered ? 'ol' : 'ul'])}>\n${items
      .map((item) => renderer.listitem(item))
      .join('')}</${type}>\n`
  }

  renderer.paragraph = ({ tokens }) =>
    `<p${styleAttr(finalStyles.p)}>${renderer.parser.parseInline(tokens)}</p>\n`

  renderer.strong = ({ tokens }) =>
    `<strong${styleAttr(finalStyles.bold)}>${renderer.parser.parseInline(tokens)}</strong>`

  renderer.tablecell = ({ tokens, align, header }) => {
    const text = renderer.parser.parseInline(tokens)
    const type = header ? 'th' : 'td'
    const alignAttr = align ? ` align="${align}"` : ''
    return `<${type}${alignAttr}${styleAttr(finalStyles.td)}>${text}</${type}>\n`
  }

  renderer.tablerow = ({ text }) => `<tr${styleAttr(finalStyles.tr)}>\n${text}</tr>\n`

  renderer.table = ({ header, rows }) => {
    const theadRow = renderer.tablerow({
      text: header.map((cell) => renderer.tablecell(cell)).join(''),
    })
    const tbodyRows = rows
      .map((row) =>
        renderer.tablerow({ text: row.map((cell) => renderer.tablecell(cell)).join('') }),
      )
      .join('')
    const thead = `<thead${styleAttr(finalStyles.thead)}>\n${theadRow}</thead>`
    const tbody = `<tbody${styleAttr(finalStyles.tbody)}>${tbodyRows}</tbody>`
    return `<table role="presentation"${styleAttr(finalStyles.table)}>\n${thead}\n${tbody}</table>\n`
  }

  return renderer
}

const flattenToText = (nodes: VNode[] | undefined): string => {
  if (!nodes) return ''
  let text = ''
  for (const node of nodes) {
    if (typeof node.children === 'string') {
      text += node.children
    } else if (Array.isArray(node.children)) {
      text += flattenToText(node.children as VNode[])
    }
  }
  return text
}

export const Markdown = defineComponent({
  name: 'Markdown',
  inheritAttrs: false,
  props: {
    /** Markdown source; if omitted, the default slot's text is used. */
    source: { type: String, default: undefined },
    markdownCustomStyles: { type: Object as PropType<StylesType>, default: undefined },
    markdownContainerStyles: { type: Object as PropType<CSSProperties>, default: undefined },
  },
  setup(props, { attrs, slots }) {
    return () => {
      const markdown = props.source ?? flattenToText(slots.default?.())
      const renderer = createRenderer(props.markdownCustomStyles)
      const html = marked.parse(markdown, { renderer, async: false }) as string

      return h('div', {
        ...attrs,
        'innerHTML': html,
        'data-id': 'vuemailer-markdown',
        'style': props.markdownContainerStyles,
      })
    }
  },
})
