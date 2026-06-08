import { copyFileSync } from 'node:fs'

// Ship the caniemail dataset alongside the built server (read at runtime by the linter).
copyFileSync(
  new URL('../src/caniemail.json', import.meta.url),
  new URL('../dist/caniemail.json', import.meta.url),
)
