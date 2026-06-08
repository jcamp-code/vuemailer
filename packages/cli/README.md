# @vuemailer/cli

A live-preview dev server for building emails with [`vuemailer`](../components).

```bash
pnpm add -D @vuemailer/cli
npx vuemailer dev
```

## Usage

```
vuemailer dev [options]

Options:
  --dir <path>     Emails directory (default: emails)
  --port <number>  Port to listen on (default: 3000)
  -h, --help       Show help
```

Each file in the emails directory that has a **default export** (a Vue
component) is rendered. `.vue` SFCs and `.ts`/`.js` components are both
supported. An optional `props` (or `previewProps`) named export is passed to the
component when rendering.

## How it works

The dev server runs **Vite in middleware mode** (`appType: 'custom'`) so `.vue`/
`.ts` emails compile and load via `ssrLoadModule`, then render with
`@vuemailer/render`. Vite's file watcher drives a WebSocket that live-reloads the
browser on any change — no separate bundler/watcher stack needed.

The preview UI is a **Vue 3 SPA** (in `preview-app/`, built with Vite + Reka UI +
Tailwind v4 + prismjs) served as static assets from `dist/preview`. It provides:

- a sidebar of discovered emails,
- **Preview** — a **draggable, resizable** iframe (right/bottom/corner handles)
  with **Desktop / 600 / Mobile** presets and numeric **W × H** inputs,
- an authentic **Light / Dark** toggle that emulates `prefers-color-scheme` in
  the iframe (rewrites the email's dark-mode media rules + sets `color-scheme`),
- **Open in Browser** (new tab) and **Open in Editor** (VS Code),
- **HTML** (syntax-highlighted, with **Copy HTML**),
- **Plain Text**,
- **Source** (the email's own `.vue`/`.ts` code, highlighted),
- **Compatibility** — a [caniemail](https://www.caniemail.com)-based linter
  (detectors + status logic ported from react-email) that flags CSS/HTML
  features unsupported in Gmail / Apple Mail / Outlook / Yahoo. We lint the
  **rendered HTML** (react-email scans the source AST), so each finding links to
  the line in the **HTML** tab where it lands. Unavoidable scaffolding
  (`body`/`table`/`style`/…) is tagged _structural_ and hidden behind a toggle;
  always-harmless attributes (e.g. `target`) aren't surfaced at all,
- **Linter** — link checks (broken / insecure / redirect) and image checks
  (missing alt, broken/insecure source, oversized), ported from react-email,
- **Spam** — SpamAssassin score + rule breakdown via Postmark's free public
  Spamcheck API (override with `VUEMAILER_SPAM_CHECK_URL` to self-host),
- **Copy for AI** — a tab-aware prompt (compatibility / linter / spam issues +
  the email source) you can copy or open in Cursor / Claude / ChatGPT,
- **Send test** — sends the rendered email through [Resend](https://resend.com).
  The button only appears when the dev server has `RESEND_API_KEY` set; the From
  address defaults to Resend's sandbox sender (override with `VUEMAILER_TEST_FROM`),
- live reload over the `/__hmr` WebSocket.

The preview UI chrome is dark by default.

Routes:

| Route                     | Purpose                                          |
| ------------------------- | ------------------------------------------------ |
| `GET /` (+ assets)        | Preview SPA                                      |
| `GET /api/emails`         | Discovered email list (JSON)                     |
| `GET /api/config`         | Server capabilities (e.g. `sendTest`)            |
| `GET /api/preview?file=…` | `{ html, text, source, compatibility }` per tab  |
| `GET /api/lint?file=…`    | Link & image checks                              |
| `GET /api/spam?file=…`    | SpamAssassin score + rules                       |
| `POST /api/send`          | Send a test via Resend (`{ file, to, subject }`) |
| `GET /preview?file=…`     | Rendered HTML (for the iframe)                   |
| `ws /__hmr`               | Live-reload channel                              |

## Build

`pnpm build` runs `tsup` (the server → `dist/bin.js`) then `vite build` (the SPA →
`dist/preview`). Order matters: tsup's `clean` must run before the SPA is emitted.
