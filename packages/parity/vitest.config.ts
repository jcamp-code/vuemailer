import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Compile the React (.tsx) parity templates with the automatic JSX runtime.
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  test: {
    environment: 'node',
    globals: true,
  },
})
