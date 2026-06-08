import { render } from '@vuemailer/render'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'

import { Font, Head, Markdown } from '../src'

describe('Markdown XSS hardening', () => {
  it('neutralizes javascript: URLs in links', async () => {
    const html = await render(() => h(Markdown, { source: '[click](javascript:alert(1))' }))
    expect(html).not.toContain('href="javascript:')
    expect(html).toContain('href="#"')
  })

  it('neutralizes javascript: URLs in image sources', async () => {
    const html = await render(() => h(Markdown, { source: '![x](javascript:alert(1))' }))
    expect(html).not.toContain('src="javascript:')
  })

  it('HTML-escapes raw HTML inside inline code', async () => {
    const html = await render(() => h(Markdown, { source: '`<img src=x onerror=alert(1)>`' }))
    expect(html).not.toContain('<img src=x onerror')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('HTML-escapes raw HTML inside fenced code blocks', async () => {
    const html = await render(() => h(Markdown, { source: '```\n<script>alert(1)</script>\n```' }))
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapes quotes in image titles so attributes cannot be injected', async () => {
    const html = await render(() =>
      h(Markdown, { source: '![a](https://x/i.png "t\\" onerror=alert(1)")' }),
    )
    // The closing quote in the title must be escaped so `onerror` stays inside the
    // title value rather than becoming a real attribute.
    expect(html).toContain('t&quot; onerror')
    expect(html).not.toContain('t" onerror')
  })

  it('still renders ordinary links and code unchanged', async () => {
    const html = await render(() => h(Markdown, { source: '[ok](https://example.com) and `code`' }))
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('<code')
    expect(html).toContain('code</code>')
  })
})

describe('Font <style> injection hardening', () => {
  it('prevents a fontFamily payload from breaking out of <style>', async () => {
    const html = await render(() =>
      h(Head, {}, () =>
        h(Font, {
          fontFamily: "x'} </style><script>alert(1)</script><style>{",
          fallbackFontFamily: 'Arial',
        }),
      ),
    )
    expect(html).not.toContain('</style><script>')
    expect(html).not.toContain('<script>alert(1)')
  })

  it('rejects a webFont URL with a non-http(s)/data scheme', async () => {
    await expect(
      render(() =>
        h(Head, {}, () =>
          h(Font, {
            fontFamily: 'Roboto',
            fallbackFontFamily: 'Arial',
            webFont: { url: 'javascript:alert(1)', format: 'woff2' },
          }),
        ),
      ),
    ).rejects.toThrow()
  })

  it('rejects a webFont URL containing a paren/quote breakout', async () => {
    await expect(
      render(() =>
        h(Head, {}, () =>
          h(Font, {
            fontFamily: 'Roboto',
            fallbackFontFamily: 'Arial',
            webFont: {
              url: "https://x/f.woff2) format('woff2'); } </style><script>",
              format: 'woff2',
            },
          }),
        ),
      ),
    ).rejects.toThrow()
  })

  it('renders an ordinary font face unchanged', async () => {
    const html = await render(() =>
      h(Head, {}, () =>
        h(Font, {
          fontFamily: 'Roboto',
          fallbackFontFamily: 'Arial',
          webFont: { url: 'https://example.com/roboto.woff2', format: 'woff2' },
        }),
      ),
    )
    expect(html).toContain("font-family: 'Roboto'")
    expect(html).toContain('src: url(https://example.com/roboto.woff2) format(')
  })
})
