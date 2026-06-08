import type { CSSProperties, PropType } from 'vue'

import { defineComponent, h } from 'vue'

export const Column = defineComponent({
  name: 'Column',
  inheritAttrs: false,
  props: {
    style: { type: Object as PropType<CSSProperties>, default: undefined },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        'td',
        { ...attrs, 'data-id': '__vuemailer-column', 'style': props.style },
        slots.default?.(),
      )
  },
})
