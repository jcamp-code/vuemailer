// `react-email` (6.x) re-exports both the components and `render` — it's the
// current line. (`@react-email/components` is a stale 1.x side-package.)
import * as R from 'react-email'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import {
  Button,
  Column,
  Container,
  Heading,
  Hr,
  Img,
  Link,
  Preview,
  render as renderVue,
  Row,
  Section,
  Text,
} from 'vuemailer'

import { canonicalize } from '../src/canonicalize'

interface Case {
  name: string
  react: React.ReactElement
  vue: () => unknown
}

const cases: Case[] = [
  {
    name: 'Button',
    react: (
      <R.Button
        href="https://example.com"
        style={{ padding: '12px 20px', backgroundColor: '#000000', color: '#ffffff' }}
      >
        Click me
      </R.Button>
    ),
    vue: () =>
      h(
        Button,
        {
          href: 'https://example.com',
          style: { padding: '12px 20px', backgroundColor: '#000000', color: '#ffffff' },
        },
        () => 'Click me',
      ),
  },
  {
    name: 'Container',
    react: <R.Container style={{ padding: '24px' }}>Hi</R.Container>,
    vue: () => h(Container, { style: { padding: '24px' } }, () => 'Hi'),
  },
  {
    name: 'Section',
    react: <R.Section>content</R.Section>,
    vue: () => h(Section, () => 'content'),
  },
  {
    name: 'Text',
    react: <R.Text style={{ color: '#333333' }}>hello</R.Text>,
    vue: () => h(Text, { style: { color: '#333333' } }, () => 'hello'),
  },
  {
    name: 'Heading',
    react: <R.Heading as="h2">Title</R.Heading>,
    vue: () => h(Heading, { as: 'h2' }, () => 'Title'),
  },
  {
    name: 'Hr',
    react: <R.Hr />,
    vue: () => h(Hr),
  },
  {
    name: 'Link',
    react: <R.Link href="https://example.com">go</R.Link>,
    vue: () => h(Link, { href: 'https://example.com' }, () => 'go'),
  },
  {
    name: 'Row/Column',
    react: (
      <R.Row>
        <R.Column>cell</R.Column>
      </R.Row>
    ),
    vue: () => h(Row, () => h(Column, () => 'cell')),
  },
  {
    name: 'Preview',
    react: <R.Preview>Sneak peek of the email</R.Preview>,
    vue: () => h(Preview, { text: 'Sneak peek of the email' }),
  },
]

describe('component parity (react-email vs vuemailer)', () => {
  it.each(cases)('$name renders identically', async ({ react, vue }) => {
    const reactHtml = await R.render(react)
    const vueHtml = await renderVue(vue)
    expect(canonicalize(vueHtml)).toBe(canonicalize(reactHtml))
  })
})

describe('documented, intentional divergences from react-email', () => {
  // react-email's <Img> renders a React-19 hoistable `<link rel="preload">` into
  // <head>. Preload hints are a no-op in email clients (and often stripped), so
  // vuemailer deliberately omits it. Asserted here so the gap stays visible.
  it('Img: react-email injects a preload <link>; vuemailer omits it', async () => {
    const reactHtml = await R.render(
      <R.Img src="https://example.com/cat.png" alt="A cat" width={120} height={80} />,
    )
    const vueHtml = await renderVue(() =>
      h(Img, { src: 'https://example.com/cat.png', alt: 'A cat', width: 120, height: 80 }),
    )
    expect(reactHtml).toContain('rel="preload"')
    expect(vueHtml).not.toContain('rel="preload"')
    // The <img> itself is identical.
    expect(canonicalize(vueHtml)).toContain('<img alt="A cat"')
  })
})
