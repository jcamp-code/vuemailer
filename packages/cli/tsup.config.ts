import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/bin.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  // vite/@vitejs/plugin-vue/ws/@vuemailer/render are runtime deps (kept external).
  external: ['vite', '@vitejs/plugin-vue', 'ws', '@vuemailer/render', 'vue'],
})
