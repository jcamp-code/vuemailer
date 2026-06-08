---
'@vuemailer/cli': patch
---

Use `@vuemailer/caniemail` for Can I Email compatibility linting. The lint engine + dataset were extracted into their own package; the CLI now consumes `lintHtml` from it (no user-facing change to `vuemailer dev`).
