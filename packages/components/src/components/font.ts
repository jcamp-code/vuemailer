import type { PropType } from 'vue'

import { defineComponent, h } from 'vue'

type FontStyle = 'normal' | 'italic' | 'oblique'
type FontWeight = number | (string & {})

type FallbackFont =
  | 'Arial'
  | 'Helvetica'
  | 'Verdana'
  | 'Georgia'
  | 'Times New Roman'
  | 'serif'
  | 'sans-serif'
  | 'monospace'
  | 'cursive'
  | 'fantasy'

type FontFormat = 'woff' | 'woff2' | 'truetype' | 'opentype' | 'embedded-opentype' | 'svg'

// The <style> body is assigned via innerHTML, so every interpolated value must be
// neutralized for the CSS-string context — otherwise a crafted prop can close the
// quote/rule and break out with `</style><script>…`.

// Control chars (incl. newlines), backslash, both quotes, and angle brackets — the
// only characters that can terminate a CSS string or the surrounding <style> element.
// eslint-disable-next-line no-control-regex
const CSS_STRING_UNSAFE = /[\u0000-\u001f\\'"<>]/g

/** Escape a value placed inside a single-quoted CSS string (e.g. font-family). */
const escapeCssString = (value: unknown): string =>
  String(value).replace(CSS_STRING_UNSAFE, (c) => `\\${c.charCodeAt(0).toString(16)} `)

/** Escape an unquoted CSS keyword value (font-style / font-weight). */
const escapeCssKeyword = (value: unknown): string => String(value).replace(/[^a-zA-Z0-9%.\- ]/g, '')

/** Validate a web-font URL: only http(s)/data and no characters that escape `url(...)`. */
const safeFontUrl = (url: string): string => {
  if (!/^(?:https?:|data:)/i.test(url) || /["'()\s<>\\]/.test(url)) {
    throw new Error('Font webFont.url must be an http(s)/data URL with no quotes or whitespace.')
  }
  return url
}

/** The component MUST be placed inside the `<Head>` tag. */
export const Font = defineComponent({
  name: 'Font',
  props: {
    fontFamily: { type: String, required: true },
    fallbackFontFamily: {
      type: [String, Array] as PropType<FallbackFont | FallbackFont[]>,
      required: true,
    },
    webFont: {
      type: Object as PropType<{ url: string; format: FontFormat }>,
      default: undefined,
    },
    fontStyle: { type: String as PropType<FontStyle>, default: 'normal' },
    fontWeight: {
      type: [String, Number] as PropType<FontWeight>,
      default: 400,
    },
  },
  setup(props) {
    return () => {
      const src = props.webFont
        ? `src: url(${safeFontUrl(props.webFont.url)}) format('${escapeCssString(
            props.webFont.format,
          )}');`
        : ''

      const fallback = Array.isArray(props.fallbackFontFamily)
        ? props.fallbackFontFamily
        : [props.fallbackFontFamily]

      const family = escapeCssString(props.fontFamily)
      const style = `
    @font-face {
      font-family: '${family}';
      font-style: ${escapeCssKeyword(props.fontStyle)};
      font-weight: ${escapeCssKeyword(props.fontWeight)};
      mso-font-alt: '${escapeCssString(fallback[0])}';
      ${src}
    }

    * {
      font-family: '${family}', ${fallback.map((f) => escapeCssString(f)).join(', ')};
    }
  `

      return h('style', { innerHTML: style })
    }
  },
})
