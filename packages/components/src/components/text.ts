import type { CSSProperties, PropType } from 'vue'

import { defineComponent, h } from 'vue'

type MarginValue = string | number | undefined

interface MarginResult {
  marginTop: MarginValue
  marginRight: MarginValue
  marginBottom: MarginValue
  marginLeft: MarginValue
}

function parseMarginValue(value: MarginValue): MarginResult {
  if (typeof value === 'number') {
    return { marginTop: value, marginRight: value, marginBottom: value, marginLeft: value }
  }

  if (typeof value === 'string') {
    const values = value.trim().split(/\s+/)
    if (values.length === 1) {
      return {
        marginTop: values[0],
        marginRight: values[0],
        marginBottom: values[0],
        marginLeft: values[0],
      }
    }
    if (values.length === 2) {
      return {
        marginTop: values[0],
        marginRight: values[1],
        marginBottom: values[0],
        marginLeft: values[1],
      }
    }
    if (values.length === 3) {
      return {
        marginTop: values[0],
        marginRight: values[1],
        marginBottom: values[2],
        marginLeft: values[1],
      }
    }
    if (values.length === 4) {
      return {
        marginTop: values[0],
        marginRight: values[1],
        marginBottom: values[2],
        marginLeft: values[3],
      }
    }
  }

  return {
    marginTop: undefined,
    marginRight: undefined,
    marginBottom: undefined,
    marginLeft: undefined,
  }
}

function computeMargins(properties: Record<string, MarginValue>): MarginResult {
  let result: MarginResult = {
    marginTop: undefined,
    marginRight: undefined,
    marginBottom: undefined,
    marginLeft: undefined,
  }

  for (const [key, value] of Object.entries(properties)) {
    if (key === 'margin') {
      result = parseMarginValue(value)
    } else if (key === 'marginTop') {
      result.marginTop = value
    } else if (key === 'marginRight') {
      result.marginRight = value
    } else if (key === 'marginBottom') {
      result.marginBottom = value
    } else if (key === 'marginLeft') {
      result.marginLeft = value
    }
  }

  return result
}

export const Text = defineComponent({
  name: 'Text',
  inheritAttrs: false,
  props: {
    style: { type: Object as PropType<CSSProperties>, default: undefined },
  },
  setup(props, { attrs, slots }) {
    return () => {
      const style = props.style

      // Spread default margins this way (not inline) so that the property
      // ordering of an explicit `margin`/`marginTop` in `style` is preserved.
      const defaultMargins: CSSProperties = {}
      if (style?.marginTop === undefined) {
        defaultMargins.marginTop = '16px'
      }
      if (style?.marginBottom === undefined) {
        defaultMargins.marginBottom = '16px'
      }

      const margins = computeMargins({
        ...(defaultMargins as Record<string, MarginValue>),
        ...(style as Record<string, MarginValue>),
      })

      return h(
        'p',
        {
          ...attrs,
          style: { fontSize: '14px', lineHeight: '24px', ...style, ...margins },
        },
        slots.default?.(),
      )
    }
  },
})
