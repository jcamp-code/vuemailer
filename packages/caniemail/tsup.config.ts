import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  treeshake: true,
  // caniemail.json is inlined by esbuild's json loader — the dataset ships inside the bundle.
})
