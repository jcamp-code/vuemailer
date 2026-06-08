import { defineConfig } from 'tsup'

export default defineConfig({
  // `code-block` is a separate entry so the optional `prismjs` peer is only loaded when consumers import
  // `vuemailer/code-block` (mirrors @vuemailer/core).
  entry: {
    'index': 'src/index.ts',
    'code-block': 'src/code-block.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  treeshake: true,
  // Re-export only — keep the scoped packages external.
  external: [
    '@vuemailer/core',
    '@vuemailer/core/code-block',
    '@vuemailer/render',
    'vue',
    'prismjs',
  ],
})
