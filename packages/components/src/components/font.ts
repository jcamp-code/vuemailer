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
        ? `src: url(${props.webFont.url}) format('${props.webFont.format}');`
        : ''

      const fallback = Array.isArray(props.fallbackFontFamily)
        ? props.fallbackFontFamily
        : [props.fallbackFontFamily]

      const style = `
    @font-face {
      font-family: '${props.fontFamily}';
      font-style: ${props.fontStyle};
      font-weight: ${props.fontWeight};
      mso-font-alt: '${fallback[0]}';
      ${src}
    }

    * {
      font-family: '${props.fontFamily}', ${fallback.join(', ')};
    }
  `

      return h('style', { innerHTML: style })
    }
  },
})
