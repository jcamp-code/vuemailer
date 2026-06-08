import { defineConfig } from 'tsup'

export default defineConfig({
  // `code-block` is a separate entry so the optional `prismjs` peer dependency
  // is only loaded when consumers import `vuemailer/code-block`.
  entry: {
    'index': 'src/index.ts',
    'code-block': 'src/components/code-block/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  treeshake: true,
  external: ['vue', '@vuemailer/render', 'prismjs'],
})
