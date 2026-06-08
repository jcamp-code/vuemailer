import type { CssNode, Rule, StyleSheet } from 'css-tree'
import type { PropType, VNode } from 'vue'

import { generate, List } from 'css-tree'
import {
  Comment,
  defineComponent,
  Fragment,
  h,
  isVNode,
  normalizeClass,
  Static,
  Text as TextVNode,
} from 'vue'
import { renderToString } from 'vue/server-renderer'

import type { TailwindConfig } from './types.js'

import { Head } from '../head.js'
import { sanitizeStyleSheet } from './sanitize-stylesheet.js'
import { sanitizeClassName } from './utils/compatibility/sanitize-class-name.js'
import { downlevelForEmailClients } from './utils/css/downlevel-for-email-clients.js'
import { extractRulesPerClass } from './utils/css/extract-rules-per-class.js'
import { getCustomProperties } from './utils/css/get-custom-properties.js'
import { makeInlineStylesFor } from './utils/css/make-inline-styles-for.js'
import { sanitizeNonInlinableRules } from './utils/css/sanitize-non-inlinable-rules.js'
import { setupTailwind } from './utils/tailwindcss/setup-tailwind.js'
import { fromDashCaseToCamelCase } from './utils/text/from-dash-case-to-camel-case.js'

export type { TailwindConfig } from './types.js'
export { pixelBasedPreset } from './types.js'

const ROOT_TAG = 'vuemailer-tw-root'

type StyleInput = string | Record<string, unknown> | unknown[] | undefined | null

const toCamel = (prop: string) => (prop.startsWith('--') ? prop : fromDashCaseToCamelCase(prop))

/** Normalizes any Vue `style` binding (string | object | array) to a camelCased object. */
function normalizeStyleToObject(style: StyleInput): Record<string, unknown> {
  if (!style) return {}
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map((s) => normalizeStyleToObject(s as StyleInput)))
  }
  if (typeof style === 'string') {
    const object: Record<string, unknown> = {}
    for (const declaration of style.split(';')) {
      const index = declaration.indexOf(':')
      if (index === -1) continue
      const prop = declaration.slice(0, index).trim()
      if (prop) object[toCamel(prop)] = declaration.slice(index + 1).trim()
    }
    return object
  }
  if (typeof style === 'object') {
    const object: Record<string, unknown> = {}
    for (const key of Object.keys(style)) {
      object[toCamel(key)] = (style as Record<string, unknown>)[key]
    }
    return object
  }
  return {}
}

const collectClassNames = (markup: string): string[] => {
  const classSet = new Set<string>()
  for (const [, doubleQuoted, singleQuoted] of markup.matchAll(
    /\sclass=(?:"([^"]*)"|'([^']*)')/g,
  )) {
    for (const className of (doubleQuoted ?? singleQuoted ?? '').split(/\s+/)) {
      if (className) classSet.add(className)
    }
  }
  return Array.from(classSet)
}

export const Tailwind = defineComponent({
  name: 'Tailwind',
  props: {
    config: { type: Object as PropType<TailwindConfig>, default: undefined },
    theme: { type: String, default: undefined },
    utility: { type: String, default: undefined },
  },
  async setup(props, { slots }) {
    if (!slots.default) {
      throw new Error('Tailwind component must have a default slot')
    }

    // First pass: render to HTML purely to discover which classes are used and
    // whether the template has a <head>. The actual output is produced by
    // transforming the VNode tree (below), so styles are inlined *before*
    // components apply their defaults — matching react-email's precedence of
    // user-inline-style > Tailwind utility > component default.
    const markup = await renderToString(h(ROOT_TAG, slots.default()))
    const classes = collectClassNames(markup)
    const hasHead = /<head[\s>]/.test(markup)

    const tailwind = await setupTailwind({
      config: props.config,
      cssConfigs: { theme: props.theme, utility: props.utility },
    })
    tailwind.addUtilities(classes)

    const styleSheet = tailwind.getStyleSheet()
    sanitizeStyleSheet(styleSheet)

    const { inlinable: inlinableRules, nonInlinable: nonInlinableRules } = extractRulesPerClass(
      styleSheet,
      classes,
    )
    const customProperties = getCustomProperties(styleSheet)

    const nonInlineStyles: StyleSheet = {
      type: 'StyleSheet',
      children: new List<CssNode>().fromArray(Array.from(nonInlinableRules.values())),
    }
    sanitizeNonInlinableRules(nonInlineStyles)
    downlevelForEmailClients(nonInlineStyles)

    const hasNonInlineStyles = nonInlinableRules.size > 0
    const headCss = generate(nonInlineStyles)
    const headStyleVNode = () => h('style', { innerHTML: headCss })

    const toArray = (value: unknown): unknown[] =>
      value == null ? [] : Array.isArray(value) ? value : [value]

    const transform = (node: unknown): unknown => {
      if (Array.isArray(node)) return node.map(transform)
      if (!isVNode(node)) return node

      const vnode = node as VNode
      const { type } = vnode
      if (type === TextVNode || type === Comment || type === Static) {
        return vnode
      }

      const isElement = typeof type === 'string'
      const isFragment = type === Fragment
      const isComponent =
        !isElement && !isFragment && (typeof type === 'object' || typeof type === 'function')
      const isHead = type === Head || type === 'head'

      const newProps: Record<string, unknown> = { ...vnode.props }

      const className = vnode.props?.class == null ? '' : normalizeClass(vnode.props.class)
      if (className) {
        const rules: Rule[] = []
        const classesToKeep: string[] = []
        for (const name of className.split(/\s+/).filter(Boolean)) {
          const rule = inlinableRules.get(name)
          if (rule) rules.push(rule)
          if (nonInlinableRules.has(name)) {
            classesToKeep.push(sanitizeClassName(name))
          } else if (!rule) {
            classesToKeep.push(name)
          }
        }

        if (rules.length > 0) {
          // Tailwind styles first so an explicit `style` on the node still wins.
          newProps.style = {
            ...makeInlineStylesFor(rules, customProperties),
            ...normalizeStyleToObject(vnode.props?.style as StyleInput),
          }
        }
        if (classesToKeep.length > 0) {
          newProps.class = classesToKeep.join(' ')
        } else {
          delete newProps.class
        }
      }

      if (isComponent) {
        const children = vnode.children
        let slotsObject: Record<string, unknown>
        if (children && typeof children === 'object' && !Array.isArray(children)) {
          slotsObject = {}
          for (const key of Object.keys(children)) {
            const slotFn = (children as Record<string, unknown>)[key]
            slotsObject[key] =
              typeof slotFn === 'function'
                ? (...args: unknown[]) =>
                    transform((slotFn as (...a: unknown[]) => unknown)(...args))
                : slotFn
          }
        } else {
          slotsObject = { default: () => transform(children) }
        }

        if (isHead && hasNonInlineStyles) {
          const original = slotsObject.default as ((...a: unknown[]) => unknown) | undefined
          slotsObject.default = (...args: unknown[]) => [
            ...(original ? toArray(original(...args)) : []),
            headStyleVNode(),
          ]
        }

        return h(type as any, newProps, slotsObject)
      }

      // Element or Fragment
      let newChildren = transform(vnode.children)
      if (isHead && hasNonInlineStyles) {
        newChildren = [...toArray(newChildren), headStyleVNode()]
      }
      return h(type as any, newProps, newChildren as any)
    }

    return () => {
      const transformed = toArray(transform(slots.default!()))
      // No <head> to host responsive/pseudo rules: prepend the <style> so the
      // rules still ship (inline utilities already applied). Add a <Head /> for
      // proper placement.
      if (hasNonInlineStyles && !hasHead) {
        return [headStyleVNode(), ...transformed]
      }
      return transformed
    }
  },
})
