import type { CSSProperties, PropType } from 'vue'

import { defineComponent, h } from 'vue'

export const Link = defineComponent({
  name: 'Link',
  inheritAttrs: false,
  props: {
    target: { type: String, default: '_blank' },
    style: { type: Object as PropType<CSSProperties>, default: undefined },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        'a',
        {
          ...attrs,
          target: props.target,
          style: { color: '#067df7', textDecorationLine: 'none', ...props.style },
        },
        slots.default?.(),
      )
  },
})
