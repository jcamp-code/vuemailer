# vuemailer

Build and send emails with Vue. The consumer-facing umbrella — re-exports
[`@vuemailer/core`](../components) (components + the render API), so you import everything from one name:

```ts
import { Html, Body, Container, Button, Text, render } from 'vuemailer'
```

Prefer granular packages? Use the scoped ones directly: `@vuemailer/core`, `@vuemailer/render`,
`@vuemailer/caniemail`, `@vuemailer/cli`. The optional Prism-powered code block lives at `vuemailer/code-block`
(loads `prismjs` only then).
