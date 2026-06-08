# @vuemailer/render

Transform Vue components into HTML email templates. The SSR rendering engine
behind [`vuemailer`](https://github.com/jcamp-code/vuemailer/tree/main/packages/components):
it renders a Vue component with `createSSRApp` + `vue/server-renderer`, then
post-processes the output for email — pretty-printing, plain-text conversion,
and XHTML void-element self-closing — matching
[react-email](https://github.com/resend/react-email)'s output.

```bash
pnpm add @vuemailer/render
```

## Usage

```ts
import { render } from '@vuemailer/render'
import Email from './email.vue'

// Production HTML (minified, self-closed void elements)
const html = await render(Email, { name: 'Ada' })

// Pretty-printed HTML
const pretty = await render(Email, { name: 'Ada' }, { pretty: true })

// Plain-text version
const text = await render(Email, { name: 'Ada' }, { plainText: true })
```

## API

```ts
render(
  component: Component,
  props?: Record<string, unknown>,
  options?: { pretty?: boolean; plainText?: boolean },
): Promise<string>
```

- **`pretty`** — format the HTML with a prettier-based pretty-printer.
- **`plainText`** — return a plain-text rendering (via `html-to-text`) instead
  of HTML.

## License

MIT. Derived from [react-email](https://github.com/resend/react-email) and
[vue-email](https://github.com/vue-email/vue-email) (both MIT).
