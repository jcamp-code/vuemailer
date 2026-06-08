import { render } from '@vuemailer/render'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'

import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Markdown,
  Preview,
  Row,
  Section,
  Text,
} from '../src'

describe('components', () => {
  it('Button renders an anchor with MSO conditional comments and resolved padding', async () => {
    const html = await render(() =>
      h(Button, { href: 'https://example.com', style: { padding: '12px 20px' } }, () => 'Click'),
    )
    expect(html).toContain('<a')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('Click')
    expect(html).toContain('[if mso]')
    expect(html).toContain('padding-left:20px')
  })

  it('Container puts padding on the inner td and max-width on the table', async () => {
    const html = await render(() => h(Container, { style: { padding: '24px' } }, () => 'Hi'))
    expect(html).toContain('max-width:37.5em')
    expect(html).toContain('<td style="padding:24px')
  })

  it('Section renders a presentation table', async () => {
    const html = await render(() => h(Section, () => 'content'))
    expect(html).toContain('role="presentation"')
    expect(html).toContain('content')
  })

  it('Text applies default font size and margins', async () => {
    const html = await render(() => h(Text, () => 'hello'))
    expect(html).toContain('font-size:14px')
    expect(html).toContain('margin-top:16px')
    expect(html).toContain('margin-bottom:16px')
  })

  it('Heading honours the `as` prop and margin shorthand', async () => {
    const html = await render(() => h(Heading, { as: 'h2', mx: 8 }, () => 'Title'))
    expect(html).toContain('<h2')
    expect(html).toContain('margin-left:8px')
    expect(html).toContain('margin-right:8px')
  })

  it('Img defaults alt to an empty string and is display:block', async () => {
    const html = await render(() => h(Img, { src: 'cat.png' }))
    // Vue serializes an empty-string attribute as the bare attribute name.
    expect(html).toMatch(/<img alt[ >]/)
    expect(html).toContain('display:block')
  })

  it('Link defaults target to _blank', async () => {
    const html = await render(() => h(Link, { href: '#' }, () => 'go'))
    expect(html).toContain('target="_blank"')
  })

  it('Hr renders an email-safe rule', async () => {
    const html = await render(() => h(Hr))
    expect(html).toContain('border-top:1px solid #eaeaea')
  })

  it('Row wraps children in a full-width table row', async () => {
    const html = await render(() => h(Row, () => h(Column, () => 'cell')))
    expect(html).toContain('__vuemailer-column')
    expect(html).toContain('cell')
  })

  it('Preview renders a hidden preview div and a title tag', async () => {
    const html = await render(() => h(Preview, { text: 'Sneak peek' }))
    expect(html).toContain('<title>Sneak peek</title>')
    expect(html).toContain('data-skip-in-text="true"')
  })

  it('renders a full document via Html/Head/Body', async () => {
    const html = await render(() =>
      h(Html, () => [h(Head), h(Body, () => h(Text, () => 'Welcome'))]),
    )
    expect(html).toContain('<html')
    expect(html).toContain('x-apple-disable-message-reformatting')
    expect(html).toContain('Welcome')
  })

  it('Markdown converts markdown to styled HTML', async () => {
    const html = await render(() => h(Markdown, { source: '# Title\n\n**bold**' }))
    expect(html).toContain('<h1')
    expect(html).toContain('Title')
    expect(html).toContain('<strong')
  })
})
