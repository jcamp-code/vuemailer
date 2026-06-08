import { defineComponent, h } from 'vue'

export const Html = defineComponent({
  name: 'Html',
  inheritAttrs: false,
  props: {
    lang: { type: String, default: 'en' },
    dir: { type: String, default: 'ltr' },
  },
  setup(props, { attrs, slots }) {
    return () => h('html', { ...attrs, lang: props.lang, dir: props.dir }, slots.default?.())
  },
})
