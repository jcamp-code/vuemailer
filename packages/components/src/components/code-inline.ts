import type { CSSProperties, PropType } from 'vue'

import { defineComponent, h } from 'vue'

const orangeFix = `
        meta ~ .cino {
          display: none !important;
          opacity: 0 !important;
        }

        meta ~ .cio {
          display: block !important;
        }
      `

/**
 * If you are sending emails for users on the Orange.fr email client, this
 * component will only work when the email has a `<Head>` containing meta tags.
 */
export const CodeInline = defineComponent({
  name: 'CodeInline',
  inheritAttrs: false,
  props: {
    style: { type: Object as PropType<CSSProperties>, default: undefined },
  },
  setup(props, { attrs, slots }) {
    return () => {
      const userClass = attrs.class
      return [
        h('style', { innerHTML: orangeFix }),
        // Does not render on Orange.fr
        h('code', { ...attrs, class: [userClass, 'cino'] }, slots.default?.()),
        // Renders only on Orange.fr
        h(
          'span',
          {
            ...attrs,
            class: [userClass, 'cio'],
            style: { display: 'none', ...props.style },
          },
          slots.default?.(),
        ),
      ]
    }
  },
})
