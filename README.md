# vuemailer

Build and send emails with Vue. A Vue 3 component library and rendering engine
for crafting responsive HTML emails, with a live preview dev server.

> Inspired by and derived from [react-email](https://github.com/resend/react-email)
> and [vue-email](https://github.com/vue-email/vue-email), both MIT-licensed.
> See [NOTICE](./NOTICE).

## Packages

| Package                                  | Description                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| [`vuemailer`](./packages/components)     | The component library (all email components) + re-exported renderer.        |
| [`@vuemailer/render`](./packages/render) | Vue SSR → HTML email rendering engine (`render`, pretty-print, plain-text). |

## Status

Early development. Roadmap:

1. ✅ Scaffold monorepo
2. ✅ Render engine (`@vuemailer/render`)
3. ✅ Components at react-email feature parity (`vuemailer`) — all 19
4. ✅ Tailwind → inline CSS (react-email's Tailwind v4 + css-tree engine)
5. ✅ CLI dev server with live reload (`@vuemailer/cli`, Vite-based)
6. ⬜ Live preview UI (fork of `@react-email/ui`)

Also: [`@vuemailer/parity`](./packages/parity) — cross-framework tests that
render equivalent templates through react-email and vuemailer and assert they
match (9/10 components identical; full welcome email 100%).

## Development

```bash
pnpm install
pnpm build
pnpm test
```
