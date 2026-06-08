# vuemailer

Build and send emails with Vue. A Vue 3 component library for crafting
responsive HTML emails, with feature parity to
[react-email](https://github.com/resend/react-email). The package also
re-exports the [`@vuemailer/render`](https://github.com/jcamp-code/vuemailer/tree/main/packages/render)
engine, so `render` is available straight from `vuemailer`.

```bash
pnpm add vuemailer
```

## Usage

```vue
<!-- emails/welcome.vue -->
<script setup lang="ts">
import { Body, Button, Container, Head, Html, Text } from 'vuemailer'

defineProps<{ name: string }>()
</script>

<template>
  <Html lang="en">
    <Head />
    <Body :style="{ backgroundColor: '#f6f9fc', fontFamily: 'sans-serif' }">
      <Container>
        <Text>Hi {{ name }}, welcome aboard!</Text>
        <Button
          href="https://example.com"
          :style="{ background: '#2563eb', color: '#fff', padding: '12px 20px' }"
        >
          Get started
        </Button>
      </Container>
    </Body>
  </Html>
</template>
```

```ts
import { render } from 'vuemailer'
import Welcome from './emails/welcome.vue'

const html = await render(Welcome, { name: 'Ada' }, { pretty: true })
const text = await render(Welcome, { name: 'Ada' }, { plainText: true })
```

## Components

`Html`, `Head`, `Body`, `Container`, `Section`, `Row`, `Column`, `Heading`,
`Text`, `Link`, `Button`, `Img`, `Hr`, `Font`, `Preview`, `Markdown`,
`CodeInline`, and `Tailwind` — write [Tailwind](https://tailwindcss.com) utility
classes and have them inlined into email-safe CSS (built on react-email's
Tailwind v4 + css-tree engine).

### CodeBlock

`CodeBlock` is published under a separate entry point so the rest of the library
doesn't pull in [prismjs](https://prismjs.com). It's an **optional peer
dependency** — install it only if you use `CodeBlock`:

```bash
pnpm add prismjs
```

```ts
import { CodeBlock } from 'vuemailer/code-block'
```

## Related

- [`@vuemailer/render`](https://github.com/jcamp-code/vuemailer/tree/main/packages/render) — the SSR rendering engine.
- [`@vuemailer/cli`](https://github.com/jcamp-code/vuemailer/tree/main/packages/cli) — a live-preview dev server.

## License

MIT. Derived from [react-email](https://github.com/resend/react-email) and
[vue-email](https://github.com/vue-email/vue-email) (both MIT) — see
[Credits](https://github.com/jcamp-code/vuemailer#credits).
