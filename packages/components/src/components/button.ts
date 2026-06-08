import type { CSSProperties, PropType } from 'vue'

import { defineComponent, h } from 'vue'

type PaddingValue = string | number | undefined

interface PaddingProperties {
  padding?: PaddingValue
  paddingTop?: PaddingValue
  paddingRight?: PaddingValue
  paddingBottom?: PaddingValue
  paddingLeft?: PaddingValue
}

/** Converts a padding value to its `px` equivalent. e.g. "1em" => 16 */
function convertToPx(value: PaddingValue): number {
  if (!value) return 0
  if (typeof value === 'number') return value

  const matches = /^([\d.]+)(px|em|rem|%)$/.exec(value)
  if (matches && matches.length === 3) {
    const numValue = Number.parseFloat(matches[1]!)
    const unit = matches[2]!
    switch (unit) {
      case 'px':
        return numValue
      case 'em':
      case 'rem':
        return numValue * 16
      case '%':
        return (numValue / 100) * 600
      default:
        return numValue
    }
  }
  return 0
}

function parsePaddingValue(value: PaddingValue) {
  if (typeof value === 'number') {
    return { paddingTop: value, paddingBottom: value, paddingLeft: value, paddingRight: value }
  }

  if (typeof value === 'string') {
    const values = value.trim().split(/\s+/)
    if (values.length === 1) {
      return {
        paddingTop: values[0],
        paddingBottom: values[0],
        paddingLeft: values[0],
        paddingRight: values[0],
      }
    }
    if (values.length === 2) {
      return {
        paddingTop: values[0],
        paddingRight: values[1],
        paddingBottom: values[0],
        paddingLeft: values[1],
      }
    }
    if (values.length === 3) {
      return {
        paddingTop: values[0],
        paddingRight: values[1],
        paddingBottom: values[2],
        paddingLeft: values[1],
      }
    }
    if (values.length === 4) {
      return {
        paddingTop: values[0],
        paddingRight: values[1],
        paddingBottom: values[2],
        paddingLeft: values[3],
      }
    }
  }

  return {
    paddingTop: undefined,
    paddingBottom: undefined,
    paddingLeft: undefined,
    paddingRight: undefined,
  }
}

function parsePadding(properties: PaddingProperties) {
  let paddingTop: PaddingValue
  let paddingRight: PaddingValue
  let paddingBottom: PaddingValue
  let paddingLeft: PaddingValue

  for (const [key, value] of Object.entries(properties)) {
    if (key === 'padding') {
      ;({ paddingTop, paddingBottom, paddingLeft, paddingRight } = parsePaddingValue(value))
    } else if (key === 'paddingTop') {
      paddingTop = value
    } else if (key === 'paddingRight') {
      paddingRight = value
    } else if (key === 'paddingBottom') {
      paddingBottom = value
    } else if (key === 'paddingLeft') {
      paddingLeft = value
    }
  }

  return {
    paddingTop: paddingTop ? convertToPx(paddingTop) : undefined,
    paddingRight: paddingRight ? convertToPx(paddingRight) : undefined,
    paddingBottom: paddingBottom ? convertToPx(paddingBottom) : undefined,
    paddingLeft: paddingLeft ? convertToPx(paddingLeft) : undefined,
  }
}

const pxToPt = (px: number | undefined): number | undefined =>
  typeof px === 'number' && !Number.isNaN(Number(px)) ? (px * 3) / 4 : undefined

// Unlike React, Vue does not auto-append `px` to numeric inline-style values,
// so we convert resolved pixel values to strings ourselves.
const toPx = (value: number | undefined): string | undefined =>
  value === undefined ? undefined : `${value}px`

const maxFontWidth = 5

/**
 * Computes an `mso-font-width` <= 500% and a count of space characters that,
 * applied together, approximate `expectedWidth` as closely as possible.
 */
function computeFontWidthAndSpaceCount(expectedWidth: number): readonly [number, number] {
  if (expectedWidth === 0) return [0, 0] as const

  let smallestSpaceCount = 0
  const computeRequiredFontWidth = () =>
    smallestSpaceCount > 0 ? expectedWidth / smallestSpaceCount / 2 : Number.POSITIVE_INFINITY

  while (computeRequiredFontWidth() > maxFontWidth) {
    smallestSpaceCount++
  }

  return [computeRequiredFontWidth(), smallestSpaceCount] as const
}

export const Button = defineComponent({
  name: 'Button',
  inheritAttrs: false,
  props: {
    target: { type: String, default: '_blank' },
    style: { type: Object as PropType<CSSProperties>, default: undefined },
  },
  setup(props, { attrs, slots }) {
    return () => {
      const style = props.style
      const { paddingTop, paddingRight, paddingBottom, paddingLeft } = parsePadding(style ?? {})

      const y = (paddingTop ?? 0) + (paddingBottom ?? 0)
      const textRaise = pxToPt(y)

      const [plFontWidth, plSpaceCount] = computeFontWidthAndSpaceCount(paddingLeft ?? 0)
      const [prFontWidth, prSpaceCount] = computeFontWidthAndSpaceCount(paddingRight ?? 0)

      // The `&#8202;` (hair space) is the closest to `1px` of empty character we
      // can get; `mso-font-width` scales it. Percentages >= 500% are unsupported,
      // so extra spaces are added accordingly.
      const leftSpan = `<!--[if mso]><i style="mso-font-width:${
        plFontWidth * 100
      }%;mso-text-raise:${textRaise}" hidden>${'&#8202;'.repeat(plSpaceCount)}</i><![endif]-->`
      const rightSpan = `<!--[if mso]><i style="mso-font-width:${
        prFontWidth * 100
      }%" hidden>${'&#8202;'.repeat(prSpaceCount)}&#8203;</i><![endif]-->`

      return h(
        'a',
        {
          ...attrs,
          target: props.target,
          style: {
            lineHeight: '100%',
            textDecoration: 'none',
            display: 'inline-block',
            maxWidth: '100%',
            msoPaddingAlt: '0px',
            ...style,
            paddingTop: toPx(paddingTop),
            paddingRight: toPx(paddingRight),
            paddingBottom: toPx(paddingBottom),
            paddingLeft: toPx(paddingLeft),
          },
        },
        [
          h('span', { innerHTML: leftSpan }),
          h(
            'span',
            {
              style: {
                maxWidth: '100%',
                display: 'inline-block',
                lineHeight: '120%',
                msoPaddingAlt: '0px',
                msoTextRaise: toPx(pxToPt(paddingBottom)),
              },
            },
            slots.default?.(),
          ),
          h('span', { innerHTML: rightSpan }),
        ],
      )
    }
  },
})
