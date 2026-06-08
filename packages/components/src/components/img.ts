import type { CSSProperties, PropType } from 'vue'

import { defineComponent, h } from 'vue'

export const Img = defineComponent({
  name: 'Img',
  inheritAttrs: false,
  props: {
    src: { type: String, default: undefined },
    alt: { type: String, default: '' },
    width: { type: [String, Number], default: undefined },
    height: { type: [String, Number], default: undefined },
    style: { type: Object as PropType<CSSProperties>, default: undefined },
  },
  setup(props, { attrs }) {
    return () =>
      h('img', {
        ...attrs,
        alt: props.alt ?? '',
        src: props.src,
        width: props.width,
        height: props.height,
        style: {
          display: 'block',
          outline: 'none',
          border: 'none',
          textDecoration: 'none',
          ...props.style,
        },
      })
  },
})
