import type { CSSProperties, PropType, VNode } from 'vue'

import { defineComponent, Fragment, h } from 'vue'

import type { PrismLanguage } from './languages-available'
import type { Theme } from './themes'

import { Prism } from './prism'

export type { PrismLanguage } from './languages-available'
export * from './themes'

type PrismToken = InstanceType<typeof Prism.Token>

const stylesForToken = (token: PrismToken, theme: Theme): CSSProperties => {
  let styles: CSSProperties = { ...theme[token.type] }
  const aliases = Array.isArray(token.alias) ? token.alias : [token.alias]
  for (const alias of aliases) {
    if (alias) styles = { ...styles, ...theme[alias] }
  }
  return styles
}

function renderToken(
  token: string | PrismToken,
  theme: Theme,
  inheritedStyles?: CSSProperties,
): VNode[] {
  if (token instanceof Prism.Token) {
    const styleForToken: CSSProperties = { ...inheritedStyles, ...stylesForToken(token, theme) }

    if (token.content instanceof Prism.Token) {
      return [h('span', { style: styleForToken }, renderToken(token.content, theme))]
    }
    if (typeof token.content === 'string') {
      return [h('span', { style: styleForToken }, token.content)]
    }
    return (token.content as Array<string | PrismToken>).flatMap((subToken) =>
      renderToken(subToken, theme, styleForToken),
    )
  }

  return [h('span', { style: inheritedStyles }, token.replaceAll(' ', '\xA0‍​'))]
}

export const CodeBlock = defineComponent({
  name: 'CodeBlock',
  inheritAttrs: false,
  props: {
    code: { type: String, required: true },
    language: { type: String as PropType<PrismLanguage>, required: true },
    theme: { type: Object as PropType<Theme>, required: true },
    lineNumbers: { type: Boolean, default: false },
    /**
     * Applies a font family on all elements rendered by this component, mostly
     * meant to override a global font already used with the `<Font>` component.
     */
    fontFamily: { type: String, default: undefined },
    style: { type: Object as PropType<CSSProperties>, default: undefined },
  },
  setup(props, { attrs }) {
    return () => {
      const grammar = Prism.languages[props.language]
      if (typeof grammar === 'undefined') {
        throw new Error(`CodeBlock: There is no language defined on Prism called ${props.language}`)
      }

      const lines = props.code.split(/\r\n|\r|\n/gm)
      const tokensPerLine = lines.map((line) => Prism.tokenize(line, grammar))

      const codeChildren = tokensPerLine.map((tokensForLine, lineIndex) => {
        const lineChildren: VNode[] = []

        if (props.lineNumbers) {
          lineChildren.push(
            h(
              'span',
              {
                style: {
                  width: '2em',
                  height: '1em',
                  display: 'inline-block',
                  fontFamily: props.fontFamily,
                },
              },
              String(lineIndex + 1),
            ),
          )
        }

        for (const token of tokensForLine) {
          lineChildren.push(...renderToken(token, props.theme, { fontFamily: props.fontFamily }))
        }
        lineChildren.push(h('br'))

        return h(Fragment, { key: lineIndex }, lineChildren)
      })

      return h('pre', { ...attrs, style: { ...props.theme.base, width: '100%', ...props.style } }, [
        h('code', codeChildren),
      ])
    }
  },
})
