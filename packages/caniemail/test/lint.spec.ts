import { describe, expect, it } from 'vitest'

import { type LintResult, lintHtml } from '../src/index'

const titles = (r: LintResult) => r.findings.map((f) => f.title)

describe('lintHtml', () => {
  it('passes clean, broadly-supported html', () => {
    const r = lintHtml('<h1>Hi</h1><p>Hello <strong>there</strong></p>')
    expect(r.issueCount).toBe(0)
    expect(r.findings).toEqual([])
    expect(r.clients).toContain('outlook')
  })

  it('flags unsupported CSS (display:flex breaks Outlook)', () => {
    const r = lintHtml('<div style="display:flex">x</div>')
    expect(r.issueCount).toBeGreaterThan(0)
    expect(titles(r).join(' ')).toMatch(/flex/i)
    const flex = r.findings.find((f) => /flex/i.test(f.title))!
    expect(flex.perClient.outlook).toBe('error')
    expect(flex.line).toBe(1)
  })

  it('does not surface harmless attributes (target) or scaffolding as errors', () => {
    // <body>/<table> are structural (tagged, not hard errors), target is suppressed entirely.
    const r = lintHtml(
      '<body><table><tr><td><a href="#" target="_blank">x</a></td></tr></table></body>',
    )
    expect(r.findings.filter((f) => /target/i.test(f.title))).toEqual([])
    // Any structural findings are flagged as such for the caller to hide by default.
    expect(r.findings.every((f) => f.structural || f.category !== 'html')).toBe(true)
  })

  it('reports the dataset metadata', () => {
    const r = lintHtml('<p>hi</p>')
    expect(typeof r.lastUpdate).toBe('string')
    expect(Object.keys(r.nicenames).length).toBeGreaterThan(0)
  })
})
