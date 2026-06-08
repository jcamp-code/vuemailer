import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'

import { render } from '../src/node'

const Hello = defineComponent({
  name: 'Hello',
  setup() {
    return () => h('p', { style: { color: 'red' } }, 'Hello world')
  },
})

describe('render', () => {
  it('renders HTML with an XHTML doctype', async () => {
    const output = await render(Hello)
    expect(output).toContain('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"')
    expect(output).toContain('Hello world')
  })

  it('renders plain text when requested', async () => {
    const output = await render(Hello, undefined, { plainText: true })
    expect(output.trim()).toBe('Hello world')
  })

  it('pretty-prints when requested', async () => {
    const output = await render(Hello, undefined, { pretty: true })
    expect(output).toContain('\n')
    expect(output).toContain('Hello world')
  })

  it('applies a sync transform hook to the final HTML', async () => {
    const output = await render(Hello, undefined, {
      transform: (html) => html.replace('Hello world', 'Goodbye world'),
    })
    expect(output).toContain('Goodbye world')
    expect(output).not.toContain('Hello world')
  })

  it('awaits an async transform hook', async () => {
    const output = await render(Hello, undefined, {
      transform: (html) => Promise.resolve(`<!-- transformed -->${html}`),
    })
    expect(output.startsWith('<!-- transformed -->')).toBe(true)
  })

  it('ignores the transform hook for plain text', async () => {
    const output = await render(Hello, undefined, {
      plainText: true,
      transform: () => 'SHOULD NOT RUN',
    })
    expect(output.trim()).toBe('Hello world')
  })
})
