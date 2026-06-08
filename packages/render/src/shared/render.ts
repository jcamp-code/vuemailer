import type { AllowedComponentProps, Component, VNodeProps } from 'vue'

import { convert } from 'html-to-text'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'

import type { Options } from './options'

import { plainTextSelectors } from './plain-text-selectors'
import { cleanup } from './utils/cleanup'
import { pretty } from './utils/pretty'
import { selfCloseVoidElements } from './utils/self-close-void-elements'

export type ExtractComponentProps<TComponent> = TComponent extends new () => {
  $props: infer P
}
  ? Omit<P, keyof VNodeProps | keyof AllowedComponentProps>
  : never

const doctype =
  '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">'

/**
 * Renders a Vue component into an HTML email string (or plain text).
 *
 * @param component  The Vue component to render.
 * @param props      Props to pass to the component.
 * @param options    Rendering options (`pretty`, `plainText`, ...).
 */
export async function render<T extends Component>(
  component: T,
  props?: ExtractComponentProps<T>,
  options?: Options,
): Promise<string> {
  const app = createSSRApp(component, (props ?? {}) as Record<string, unknown>)
  const markup = await renderToString(app)

  if (options?.plainText) {
    return convert(markup, {
      wordwrap: false,
      selectors: plainTextSelectors,
      ...options.htmlToTextOptions,
    })
  }

  let document = `${doctype}${cleanup(markup)}`

  if (options?.pretty) {
    document = await pretty(document)
  }

  // Self-close void elements (XHTML-valid) and drop empty `style`/`class`
  // attributes — Vue serializes an empty style object as `style=""`, whereas
  // React omits it entirely.
  return selfCloseVoidElements(document).replace(/ (?:class|style)=""/g, '')
}
