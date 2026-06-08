import type { CSSProperties, PropType } from 'vue'

import { defineComponent, h } from 'vue'

const paddingKeys = new Set([
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
])

export const Container = defineComponent({
  name: 'Container',
  inheritAttrs: false,
  props: {
    style: { type: Object as PropType<CSSProperties>, default: () => ({}) },
  },
  setup(props, { attrs, slots }) {
    return () => {
      // Split padding styles to improve compatibility with Klaviyo and Outlook.
      const tdStyle: Record<string, unknown> = {}
      const tableStyle: Record<string, unknown> = {}

      for (const key in props.style) {
        const value = (props.style as Record<string, unknown>)[key]
        if (paddingKeys.has(key)) {
          tdStyle[key] = value
        } else {
          tableStyle[key] = value
        }
      }

      return h(
        'table',
        {
          align: 'center',
          width: '100%',
          ...attrs,
          border: '0',
          cellpadding: '0',
          cellspacing: '0',
          role: 'presentation',
          style: { maxWidth: '37.5em', ...tableStyle },
        },
        [
          h('tbody', [
            h('tr', { style: { width: '100%' } }, [h('td', { style: tdStyle }, slots.default?.())]),
          ]),
        ],
      )
    }
  },
})
