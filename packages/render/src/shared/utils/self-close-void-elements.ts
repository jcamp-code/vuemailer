// Vue's SSR renderer emits HTML5-style void elements (`<img>`), but our output
// declares an XHTML 1.0 doctype — and react-email (via React's renderer) emits
// self-closed void elements (`<img />`). To stay byte-for-byte closer to
// react-email and valid under the XHTML doctype, we self-close them here.

const VOID_ELEMENTS = 'area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr'

// Matches a void element's open tag, skipping `>` characters inside quoted
// attribute values, and normalizes its ending to ` />`. Idempotent: an
// already self-closed tag is matched and re-emitted unchanged.
const voidElementRegex = new RegExp(
  `<(${VOID_ELEMENTS})\\b((?:"[^"]*"|'[^']*'|[^>])*?)\\s*/?>`,
  'gi',
)

export function selfCloseVoidElements(html: string): string {
  return html.replace(
    voidElementRegex,
    (_match, tag: string, attrs: string) => `<${tag}${attrs} />`,
  )
}
