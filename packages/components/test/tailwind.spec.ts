import { render } from '@vuemailer/render'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'

import { Body, Container, Head, Html, Tailwind, Text } from '../src'

describe('Tailwind', () => {
  it('inlines utility classes as styles and drops the consumed class', async () => {
    const html = await render(() =>
      h(Tailwind, () => h('div', { class: 'bg-black text-white p-4' }, 'hi')),
    )
    expect(html).toContain('background-color:rgb(0,0,0)')
    expect(html).toContain('color:rgb(255,255,255)')
    expect(html).toContain('padding:1rem')
    expect(html).not.toContain('class="bg-black')
    expect(html).toContain('>hi</div>')
  })

  it('inlines classes placed on vuemailer components (forwarded to their root)', async () => {
    const html = await render(() =>
      h(Tailwind, () => h(Container, { class: 'bg-white' }, () => 'x')),
    )
    expect(html).toContain('background-color:rgb(255,255,255)')
    expect(html).toContain('max-width:37.5em')
  })

  it('moves responsive styles into a <head> media query and keeps a sanitized class', async () => {
    const html = await render(() =>
      h(Tailwind, () =>
        h(Html, () => [h(Head), h(Body, () => h('div', { class: 'text-sm sm:text-lg' }, 'r'))]),
      ),
    )
    expect(html).toContain('<style>@media')
    expect(html).toContain('font-size:1.125rem!important')
    expect(html).toContain('sm_text-lg') // sanitized, kept on the element
    expect(html).toContain('font-size:0.875rem') // text-sm inlined
  })

  it('falls back to a prepended <style> for responsive classes when there is no <Head>', async () => {
    const html = await render(() => h(Tailwind, () => h('div', { class: 'sm:text-lg' }, 'x')))
    expect(html).toContain('<style>@media')
    expect(html).toContain('sm_text-lg')
  })

  it('preserves element structure and mixed children while inlining', async () => {
    const html = await render(() =>
      h(Tailwind, () => h('div', { class: 'flex' }, [h('img', { src: 'x.png' }), 'spacer'])),
    )
    expect(html).toContain('display:flex')
    expect(html).toContain('<img src="x.png" />')
    expect(html).toContain('spacer</div>')
  })

  it('precedence: an explicit inline style wins over a conflicting utility', async () => {
    const html = await render(() =>
      h(Tailwind, () => h('div', { class: 'text-red-500', style: { color: 'blue' } }, 'x')),
    )
    expect(html).toContain('color:blue')
    expect(html).not.toContain('color:rgb(239')
  })

  it('precedence: a utility overrides a component default', async () => {
    const html = await render(() => h(Tailwind, () => h(Text, { class: 'text-2xl' }, () => 'big')))
    // Text's default is font-size:14px; the utility must win.
    expect(html).toContain('font-size:1.5rem')
    expect(html).not.toContain('font-size:14px')
  })

  it('does not let an arbitrary-value class break out of the head <style>', async () => {
    // The head CSS is injected via innerHTML, so a `</style>` reaching it would
    // escape the element. This arbitrary value tries to smuggle one in via a CSS
    // hex escape (`\3C` = `<`), which carries no HTML-special chars.
    const html = await render(() =>
      h(Tailwind, () => h('div', { class: 'hover:[--x:\\3C/style\\3E]' }, 'hi')),
    )
    const styleBody = html.match(/<style[^>]*>([\s\S]*?)<\/style>/)?.[1] ?? ''
    // The rule must survive intact (a breakout would truncate it before the closer)…
    expect(styleBody).toContain('@media')
    // …and the body must contain neither a `</style>` sequence nor a raw tag start.
    expect(styleBody).not.toContain('</style')
    expect(styleBody).not.toMatch(/<[a-z]/i)
  })
})
