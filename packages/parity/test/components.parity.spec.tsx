// `react-email` (6.x) re-exports both the components and `render` — it's the
// current line. (`@react-email/components` is a stale 1.x side-package.)
import * as R from 'react-email'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import {
  Button,
  Column,
  Container,
  Font,
  Heading,
  Hr,
  Img,
  Link,
  Markdown,
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
  {
    // react-email takes the markdown as children; vuemailer takes a `source` prop.
    // For benign content the rendered HTML is identical.
    name: 'Markdown',
    react: <R.Markdown>{'# Title\n\n**bold** and a [link](https://example.com)'}</R.Markdown>,
    vue: () => h(Markdown, { source: '# Title\n\n**bold** and a [link](https://example.com)' }),
  },
  {
    name: 'Font',
    react: (
      <R.Font
        fontFamily="Roboto"
        fallbackFontFamily="Arial"
        webFont={{ url: 'https://example.com/roboto.woff2', format: 'woff2' }}
      />
    ),
    vue: () =>
      h(Font, {
        fontFamily: 'Roboto',
        fallbackFontFamily: 'Arial',
        webFont: { url: 'https://example.com/roboto.woff2', format: 'woff2' },
      }),
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

// vuemailer's Markdown/Font ports add output-escaping that react-email lacks. These
// are security divergences by design: the inputs below are XSS payloads that
// react-email passes through verbatim and vuemailer neutralizes. Pinned so the
// hardening can't silently regress back to react-email's (vulnerable) behavior.
describe('security divergences from react-email (hardened on purpose)', () => {
  it('Markdown: react-email emits a javascript: link; vuemailer neutralizes it', async () => {
    const source = '[click](javascript:alert(1))'
    const reactHtml = await R.render(<R.Markdown>{source}</R.Markdown>)
    const vueHtml = await renderVue(() => h(Markdown, { source }))
    expect(reactHtml).toContain('href="javascript:alert(1)"')
    expect(vueHtml).not.toContain('javascript:')
    expect(vueHtml).toContain('href="#"')
  })

  it('Markdown: react-email renders raw HTML in code spans; vuemailer escapes it', async () => {
    const source = '`<img src=x onerror=alert(1)>`'
    const reactHtml = await R.render(<R.Markdown>{source}</R.Markdown>)
    const vueHtml = await renderVue(() => h(Markdown, { source }))
    expect(reactHtml).toContain('<img src=x onerror=alert(1)>')
    expect(vueHtml).not.toContain('<img src=x onerror')
    expect(vueHtml).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('Font: a fontFamily payload breaks out of react-email but not vuemailer', async () => {
    const payload = "x'} </style><script>alert(1)</script><style>{"
    const reactHtml = await R.render(<R.Font fontFamily={payload} fallbackFontFamily="Arial" />)
    const vueHtml = await renderVue(() =>
      h(Font, { fontFamily: payload, fallbackFontFamily: 'Arial' }),
    )
    expect(reactHtml).toContain('</style><script>alert(1)</script>')
    expect(vueHtml).not.toContain('</style><script>')
  })
})
