import type { CSSProperties, PropType } from 'vue'

import { defineComponent, h } from 'vue'

const marginProperties = [
  'margin',
  'marginTop',
  'marginBottom',
  'marginRight',
  'marginLeft',
  'marginInline',
  'marginBlock',
  'marginBlockStart',
  'marginBlockEnd',
  'marginInlineStart',
  'marginInlineEnd',
] as const

const paddingProperties = [
  'padding',
  'paddingTop',
  'paddingBottom',
  'paddingRight',
  'paddingLeft',
  'paddingInline',
  'paddingBlock',
  'paddingBlockStart',
  'paddingBlockEnd',
  'paddingInlineStart',
  'paddingInlineEnd',
] as const

export const Body = defineComponent({
  name: 'Body',
  inheritAttrs: false,
  props: {
    dir: { type: String, default: undefined },
    lang: { type: String, default: undefined },
    style: { type: Object as PropType<CSSProperties>, default: undefined },
  },
  setup(props, { attrs, slots }) {
    return () => {
      const style = props.style
      const bodyStyle: Record<string, string | number | undefined> = {
        background: style?.background,
        backgroundColor: style?.backgroundColor,
      }

      if (style) {
        // We reset margin/padding the user sets so it does not sum up with the
        // margin defined by the email client on the body, or by the browser.
        for (const property of [...marginProperties, ...paddingProperties]) {
          bodyStyle[property] =
            (style as Record<string, unknown>)[property] !== undefined ? 0 : undefined
        }
      }

      const dir = props.dir ?? 'ltr'
      const lang = props.lang ?? 'en'

      return h('body', { ...attrs, dir, lang, style: bodyStyle }, [
        h(
          'table',
          {
            border: '0',
            width: '100%',
            cellpadding: '0',
            cellspacing: '0',
            role: 'presentation',
            align: 'center',
          },
          [
            h('tbody', [
              h('tr', [
                // Yahoo and AOL remove all styles of the body element while
                // converting it to a div, so we apply them to an inner cell.
                h('td', { dir, lang, style }, slots.default?.()),
              ]),
            ]),
          ],
        ),
      ])
    }
  },
})
