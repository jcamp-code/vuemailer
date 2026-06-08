import { defineComponent, h } from 'vue'

export const Head = defineComponent({
  name: 'Head',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () =>
      h('head', { ...attrs }, [
        h('meta', {
          'http-equiv': 'Content-Type',
          'content': 'text/html; charset=UTF-8',
        }),
        h('meta', { name: 'x-apple-disable-message-reformatting' }),
        slots.default?.(),
      ])
  },
})
