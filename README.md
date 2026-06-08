# vuemailer

Build and send emails with Vue. A Vue 3 component library and rendering engine
for crafting responsive HTML emails, with a live preview dev server.

> Inspired by and derived from [react-email](https://github.com/resend/react-email)
> and [vue-email](https://github.com/vue-email/vue-email), both MIT-licensed.
> See [Credits](#credits).

## Why vuemailer?

[react-email](https://github.com/resend/react-email) is a great way to build
HTML email from components, but it's React-only.
[vue-email](https://github.com/vue-email/vue-email) brought the idea to Vue, but
hasn't kept pace and has been quiet for a while.

vuemailer aims to give Vue the current react-email feature set. The approach is
to follow react-email closely rather than reinvent: match its rendered output
(checked by a [parity suite](./packages/parity) that renders equivalent
templates through both and compares them) and port its MIT-licensed utilities —
the HTML pretty-printer, the Tailwind-to-inline engine, the caniemail checks.
The Vue 3 components build on vue-email's, and there's a Vite-based live-preview
dev server.

Two things get extra attention beyond matching react-email: rendering fidelity —
clean, email-client-safe HTML with first-class plain-text and pretty-printed
output — and a modern, actively maintained toolchain that gets a security review
before each release.

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
6. ✅ Live preview UI (Vue app bundled in `@vuemailer/cli`)

Also: [`@vuemailer/parity`](./packages/parity) — cross-framework tests that
render equivalent templates through react-email and vuemailer and assert they
match (11 components identical, full welcome email 100%; `Img` and the
Markdown/Font security hardening are documented intentional divergences).

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## Credits

vuemailer stands on the shoulders of two excellent MIT-licensed projects:

- **[vue-email](https://github.com/vue-email/vue-email)** — Copyright (c) 2023
  Vue Email. Portions of the email components and the Vue server-side rendering
  pipeline are derived from vue-email.
- **[react-email](https://github.com/resend/react-email)** — Copyright (c) 2024
  Plus Five Five, Inc. Portions of the HTML pretty-printer, plain-text
  conversion, and (where noted) the Tailwind-to-inline-CSS utilities are derived
  from react-email.

Both are distributed under the MIT License, which applies to the incorporated
portions:

> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.
