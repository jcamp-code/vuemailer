import type { VNode } from 'vue'

import { defineComponent, h } from 'vue'

const PREVIEW_MAX_LENGTH = 200
const whiteSpaceCodes = '\xa0‌​‍‎‏﻿'

const renderWhiteSpace = (text: string): VNode | null => {
  if (text.length >= PREVIEW_MAX_LENGTH) return null
  return h('div', whiteSpaceCodes.repeat(PREVIEW_MAX_LENGTH - text.length))
}

const flattenToText = (nodes: VNode[] | undefined): string => {
  if (!nodes) return ''
  let text = ''
  for (const node of nodes) {
    if (typeof node.children === 'string') {
      text += node.children
    } else if (Array.isArray(node.children)) {
      text += flattenToText(node.children as VNode[])
    }
  }
  return text
}

export const Preview = defineComponent({
  name: 'Preview',
  inheritAttrs: false,
  props: {
    /** Optional explicit preview text; otherwise the default slot is used. */
    text: { type: [String, Array<string>], default: undefined },
    useTitleTag: { type: Boolean, default: true },
  },
  setup(props, { attrs, slots }) {
    return () => {
      const source =
        props.text === undefined
          ? flattenToText(slots.default?.())
          : Array.isArray(props.text)
            ? props.text.join('')
            : props.text

      const text = source.substring(0, PREVIEW_MAX_LENGTH)

      const nodes: VNode[] = []
      if (props.useTitleTag) {
        nodes.push(h('title', text))
      }
      nodes.push(
        h(
          'div',
          {
            'style': {
              display: 'none',
              overflow: 'hidden',
              lineHeight: '1px',
              opacity: 0,
              maxHeight: 0,
              maxWidth: 0,
            },
            'data-skip-in-text': 'true',
            ...attrs,
          },
          [text, renderWhiteSpace(text)],
        ),
      )
      return nodes
    }
  },
})
