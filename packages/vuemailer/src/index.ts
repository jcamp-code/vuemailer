// `vuemailer` — the consumer-facing umbrella. Re-exports @vuemailer/core (components + the render API it
// re-exports), so apps import everything from one friendly name: `import { Html, Button, render } from 'vuemailer'`.
// The scoped packages (@vuemailer/core, @vuemailer/render, @vuemailer/caniemail, @vuemailer/cli) remain
// available for granular use.
export * from '@vuemailer/core'
