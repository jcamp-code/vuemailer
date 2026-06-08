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
})
