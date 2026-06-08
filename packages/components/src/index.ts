export * from './components/body'
export * from './components/button'
// Note: `code-block` is intentionally NOT re-exported here — it pulls in the
// optional `prismjs` peer dependency. Import it from `vuemailer/code-block`.
export * from './components/code-inline'
export * from './components/column'
export * from './components/container'
export * from './components/font'
export * from './components/head'
export * from './components/heading'
export * from './components/hr'
export * from './components/html'
export * from './components/img'
export * from './components/link'
export * from './components/markdown'
export * from './components/preview'
export * from './components/row'
export * from './components/section'
export * from './components/tailwind'
export * from './components/text'

// Re-export the rendering engine for convenience: `import { render } from 'vuemailer'`.
export * from '@vuemailer/render'
