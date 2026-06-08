# @vuemailer/caniemail

## 1.0.0

### Initial release

- `lintHtml(html)` — Can I Email compatibility linting over the full `caniemail.json` dataset (the same
  detectors react-email uses), extracted from `@vuemailer/cli` into its own framework-agnostic package.
- Per-client status (`gmail`, `apple-mail`, `outlook`, `yahoo`), 1-based line numbers, and `structural` /
  suppressed classification (so `<body>`/`table`/`td` scaffolding and harmless attributes like `target` aren't
  surfaced as hard errors).
- The dataset is bundled into the package (no `fs` read, no data file to ship), so it works in any
  bundler/runtime.
