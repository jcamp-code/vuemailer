# @vuemailer/parity

Private, unpublished package. Renders equivalent email templates through
**react-email** and **vuemailer** and compares the output, so divergences from
react-email surface as test failures.

```bash
pnpm --filter @vuemailer/parity test
```

## How it works

- `src/canonicalize.ts` — parses HTML (parse5) and re-serializes it canonically:
  attributes and `style`/`class` declarations sorted, colors/whitespace/case
  normalized, and **framework comment artifacts stripped** (React's
  `<!--$-->`/`<!--html-->`/`<!--body-->` hydration & structure markers, Vue's
  empty `<!---->` slot placeholders). Only conditional comments (`[if mso]`) —
  the sole semantically-meaningful comments in email — are kept. What remains is
  real structural/semantic content.
- `test/components.parity.spec.tsx` — per-component micro-templates rendered in
  both libraries, asserted **canonically identical**.
- `test/full-email.report.spec.tsx` — a whole "welcome" email rendered in both;
  reports a token-level similarity and asserts a high threshold.
- `src/compare.ts` — similarity ratio + a readable "only in react / only in vue"
  token diff.

## Which react-email?

> ⚠️ Compare against the **`react-email`** package (currently `6.5.0`) — its
> `src/index.ts` re-exports both the components **and** `render`. Do **not** use
> `@react-email/components` (a stale `1.x` side-package, `latest` = `1.0.12`)
> nor `@react-email/render` directly — they lag the real component source.

## Current results (vs `react-email@6.5.0`)

- **9/10 components render canonically identical**: Button, Container, Section,
  Text, Heading, Hr, Link, Row/Column, Preview.
- **Whole "welcome" email: 100% identical** after canonicalization.
- **1 documented, intentional divergence** — `Img`: react-email injects a
  React-19 hoisted `<link rel="preload" as="image">` into `<head>`. Preload
  hints are a no-op in email clients (and frequently stripped), so vuemailer
  omits it. The `<img>` element itself is identical.

## Tracking drift

`react-email` is pinned to `latest` here, so `pnpm up react-email && pnpm test`
surfaces drift whenever a new react-email is published. To test against an
unreleased canary, build a local react-email checkout and point this package's
`react-email` dependency at it (e.g. `file:` link), then `git pull` + rebuild to
re-check.
