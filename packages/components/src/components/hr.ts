import type { CSSProperties, PropType } from 'vue'

import { defineComponent, h } from 'vue'

export const Hr = defineComponent({
  name: 'Hr',
  inheritAttrs: false,
  props: {
    style: { type: Object as PropType<CSSProperties>, default: undefined },
  },
  setup(props, { attrs }) {
    return () =>
      h('hr', {
        ...attrs,
        style: {
          width: '100%',
          border: 'none',
          borderColor: 'transparent',
          borderTop: '1px solid #eaeaea',
          ...props.style,
        },
      })
  },
})
