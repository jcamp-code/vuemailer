import type { CSSProperties, PropType } from 'vue'

import { defineComponent, h } from 'vue'

type MarginCSSProperty = 'margin' | 'marginLeft' | 'marginRight' | 'marginTop' | 'marginBottom'
type MarginStyles = Partial<Record<MarginCSSProperty, string>>
type Spacing = string | number | undefined

const withSpace = (value: Spacing, properties: MarginCSSProperty[]): MarginStyles => {
  const styles: MarginStyles = {}
  if (value === undefined) return styles
  if (Number.isNaN(Number.parseFloat(String(value)))) return styles
  for (const property of properties) {
    styles[property] = `${value}px`
  }
  return styles
}

const withMargin = (props: {
  m: Spacing
  mx: Spacing
  my: Spacing
  mt: Spacing
  mr: Spacing
  mb: Spacing
  ml: Spacing
}): MarginStyles => {
  const candidates = [
    withSpace(props.m, ['margin']),
    withSpace(props.mx, ['marginLeft', 'marginRight']),
    withSpace(props.my, ['marginTop', 'marginBottom']),
    withSpace(props.mt, ['marginTop']),
    withSpace(props.mr, ['marginRight']),
    withSpace(props.mb, ['marginBottom']),
    withSpace(props.ml, ['marginLeft']),
  ]

  const merged: MarginStyles = {}
  for (const style of candidates) {
    if (Object.keys(style).length > 0) {
      Object.assign(merged, style)
    }
  }
  return merged
}

export const Heading = defineComponent({
  name: 'Heading',
  inheritAttrs: false,
  props: {
    as: {
      type: String as PropType<'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'>,
      default: 'h1',
    },
    m: { type: [String, Number], default: undefined },
    mx: { type: [String, Number], default: undefined },
    my: { type: [String, Number], default: undefined },
    mt: { type: [String, Number], default: undefined },
    mr: { type: [String, Number], default: undefined },
    mb: { type: [String, Number], default: undefined },
    ml: { type: [String, Number], default: undefined },
    style: { type: Object as PropType<CSSProperties>, default: undefined },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        props.as,
        {
          ...attrs,
          style: {
            ...withMargin({
              m: props.m,
              mx: props.mx,
              my: props.my,
              mt: props.mt,
              mr: props.mr,
              mb: props.mb,
              ml: props.ml,
            }),
            ...props.style,
          },
        },
        slots.default?.(),
      )
  },
})
