import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { assertFetchable, isPrivateAddress } from '../src/checks'
import { resolveEmailPath } from '../src/commands/dev'

const EMAILS_DIR = path.resolve('/srv/app/emails')

describe('resolveEmailPath (path-traversal confinement)', () => {
  it('accepts a plain email file inside the dir', () => {
    expect(resolveEmailPath(EMAILS_DIR, 'welcome.vue')).toBe(path.join(EMAILS_DIR, 'welcome.vue'))
  })

  it('accepts a nested email file', () => {
    expect(resolveEmailPath(EMAILS_DIR, 'nested/hi.vue')).toBe(
      path.join(EMAILS_DIR, 'nested/hi.vue'),
    )
  })

  it.each([
    '../../../etc/passwd',
    '../secrets.vue',
    'nested/../../escape.vue',
    '/etc/passwd',
    '/srv/app/other.vue', // sibling of emailsDir, not inside it
  ])('rejects traversal/absolute path %j', (input) => {
    expect(() => resolveEmailPath(EMAILS_DIR, input)).toThrow()
  })

  it('rejects a path that escapes even though it ends in an email extension', () => {
    expect(() => resolveEmailPath(EMAILS_DIR, '../../tmp/evil.js')).toThrow(
      /outside the emails directory/,
    )
  })

  it('rejects non-renderable extensions inside the dir', () => {
    expect(() => resolveEmailPath(EMAILS_DIR, 'passwd')).toThrow(/renderable/)
    expect(() => resolveEmailPath(EMAILS_DIR, 'config.json')).toThrow(/renderable/)
  })
})

describe('isPrivateAddress (SSRF guard)', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254', // cloud metadata endpoint
    '0.0.0.0',
    '::1',
    'fe80::1',
    'fc00::1',
    'fd12:3456::1',
    '::ffff:127.0.0.1', // IPv4-mapped loopback
  ])('flags %s as private', (ip) => {
    expect(isPrivateAddress(ip)).toBe(true)
  })

  it.each(['8.8.8.8', '1.1.1.1', '93.184.216.34', '2606:4700:4700::1111'])(
    'allows public address %s',
    (ip) => {
      expect(isPrivateAddress(ip)).toBe(false)
    },
  )
})

describe('assertFetchable', () => {
  it.each(['javascript:alert(1)', 'file:///etc/passwd', 'data:text/html,<script>', 'ftp://x/y'])(
    'rejects unsupported scheme %j',
    async (url) => {
      await expect(assertFetchable(new URL(url))).rejects.toThrow()
    },
  )

  it('rejects a literal private IP host', async () => {
    await expect(
      assertFetchable(new URL('http://169.254.169.254/latest/meta-data')),
    ).rejects.toThrow(/private address/)
  })

  it('allows a literal public IP host', async () => {
    await expect(assertFetchable(new URL('https://93.184.216.34/'))).resolves.toBeUndefined()
  })
})
