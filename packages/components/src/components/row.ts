import type { CSSProperties, PropType } from 'vue'

import { defineComponent, h } from 'vue'

export const Row = defineComponent({
  name: 'Row',
  inheritAttrs: false,
  props: {
    style: { type: Object as PropType<CSSProperties>, default: undefined },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        'table',
        {
          align: 'center',
          width: '100%',
          border: '0',
          cellpadding: '0',
          cellspacing: '0',
          role: 'presentation',
          ...attrs,
          style: props.style,
        },
        [
          h('tbody', { style: { width: '100%' } }, [
            h('tr', { style: { width: '100%' } }, slots.default?.()),
          ]),
        ],
      )
  },
})
