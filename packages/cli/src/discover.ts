import type { Dirent } from 'node:fs'

import { readdir } from 'node:fs/promises'
import path from 'node:path'

export interface EmailEntry {
  /** Path relative to the emails directory, e.g. `welcome.vue` or `nested/hi.vue`. */
  path: string
}

const EMAIL_FILE = /\.(vue|ts|js|mjs|tsx|jsx)$/
const IGNORED = /\.(spec|test|d)\./

/** Recursively finds renderable email files under `dir`. */
export async function discoverEmails(dir: string): Promise<EmailEntry[]> {
  const found: EmailEntry[] = []

  async function walk(absolute: string, relative: string): Promise<void> {
    const entries = await readdir(absolute, { withFileTypes: true }).catch((): Dirent[] => [])

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      const childAbsolute = path.join(absolute, entry.name)
      const childRelative = relative ? `${relative}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        await walk(childAbsolute, childRelative)
      } else if (EMAIL_FILE.test(entry.name) && !IGNORED.test(entry.name)) {
        found.push({ path: childRelative })
      }
    }
  }

  await walk(dir, '')
  return found.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
}
