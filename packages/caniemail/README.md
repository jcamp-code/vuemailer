# @vuemailer/caniemail

Can I Email compatibility linting for rendered HTML emails. **Framework-agnostic** — give it any HTML string;
it checks the CSS declarations, elements, and attributes the email uses against the full
[Can I Email](https://www.caniemail.com/) dataset (the same detectors react-email uses) and returns per-feature
findings.

```ts
import { lintHtml } from '@vuemailer/caniemail'

const result = lintHtml('<div style="display:flex">…</div>')
//   result.findings: { slug, title, category, url, perClient, structural, line }[]
//   result.issueCount, result.checkedFeatures, result.clients, result.nicenames, result.lastUpdate
```

- **Per-client status** across the relevant clients (`gmail`, `apple-mail`, `outlook`, `yahoo`) — `findings[].perClient`.
- **Line numbers** — where each unsupported feature first appears in the (pretty-printed) HTML.
- **Only hard incompatibilities** are surfaced as findings (matching react-email). Always-harmless attributes
  (e.g. `target`) are never reported; unavoidable document scaffolding (`body`, `table`, `td`, `style`, …) is
  tagged `structural` so callers can hide it by default.

The caniemail dataset is bundled into the package (no `fs` read, no data file to ship), so it works in any
bundler/runtime. Used by [`@vuemailer/cli`](../cli)'s `lint`, and reusable in any tool that has rendered HTML
(a dashboard, a CI check, an editor).
