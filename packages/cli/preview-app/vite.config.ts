import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// Builds the preview SPA into the CLI's dist/preview, which the dev server
// serves as static assets.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: fileURLToPath(new URL('../dist/preview', import.meta.url)),
    emptyOutDir: true,
  },
  // Dev-mode only (vite serve): the SPA gets HMR here on :5173, while API,
  // render, and the live-reload socket are proxied to the CLI server on :3000.
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/preview': 'http://localhost:3000',
      '/__hmr': { target: 'ws://localhost:3000', ws: true },
    },
  },
})
