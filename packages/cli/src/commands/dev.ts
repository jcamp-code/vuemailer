import vuePlugin from '@vitejs/plugin-vue'
import { render } from '@vuemailer/render'
import { createReadStream } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import {
  createServer as createHttpServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer as createViteServer } from 'vite'
import { WebSocketServer } from 'ws'

import { lintEmail } from '../checks'
import { discoverEmails } from '../discover'
import { lintHtml } from '../lint'
import { canSendTest, defaultFrom, sendTest } from '../send'
import { checkSpam } from '../spam'

// The built preview SPA lives next to this file (dist/preview) after build.
const previewDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'preview')

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
}

async function serveStatic(res: ServerResponse, pathname: string): Promise<void> {
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
  let filePath = path.join(previewDir, relative)
  if (!filePath.startsWith(previewDir)) {
    res.statusCode = 403
    res.end('Forbidden')
    return
  }
  if (!(await fileExists(filePath))) {
    // SPA fallback to index.html.
    filePath = path.join(previewDir, 'index.html')
  }
  if (!(await fileExists(filePath))) {
    res.statusCode = 404
    res.end('Preview UI not built. Run `pnpm --filter @vuemailer/cli build`.')
    return
  }
  // Never cache in dev, so a rebuild is always reflected on refresh.
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('content-type', MIME[path.extname(filePath)] ?? 'application/octet-stream')
  createReadStream(filePath).pipe(res)
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile()
  } catch {
    return false
  }
}

export interface DevOptions {
  dir?: string
  port?: number
  root?: string
  /** Network interface to bind. Defaults to loopback only. Set explicitly to expose on a LAN. */
  host?: string
}

const EMAIL_FILE = /\.(vue|ts|js|mjs|tsx|jsx)$/
// Cap request bodies so a reachable POST endpoint can't OOM the process.
const MAX_BODY_BYTES = 1_048_576

/**
 * Resolve a caller-supplied email path, confined to `emailsDir`. Rejects
 * traversal (`..`), absolute paths, and non-email extensions so an untrusted
 * request can't read or execute files elsewhere on disk.
 */
export function resolveEmailPath(emailsDir: string, relFile: string): string {
  const absolute = path.resolve(emailsDir, relFile)
  if (absolute !== emailsDir && !absolute.startsWith(emailsDir + path.sep)) {
    throw new Error('Email path is outside the emails directory.')
  }
  if (!EMAIL_FILE.test(absolute)) {
    throw new Error('Not a renderable email file.')
  }
  return absolute
}

export async function dev(options: DevOptions = {}): Promise<void> {
  const root = path.resolve(options.root ?? process.cwd())
  const emailsDir = path.resolve(root, options.dir ?? 'emails')
  const port = options.port ?? 3000
  const host = options.host ?? '127.0.0.1'

  const vite = await createViteServer({
    root,
    appType: 'custom',
    logLevel: 'warn',
    server: { middlewareMode: true, hmr: false },
    plugins: [vuePlugin()],
  })

  async function renderEmail(relFile: string): Promise<{ html: string; text: string }> {
    const absolute = resolveEmailPath(emailsDir, relFile)
    const module = await vite.ssrLoadModule(absolute)
    const component = module.default
    if (!component) {
      throw new Error(`Email "${relFile}" has no default export.`)
    }
    const props = module.props ?? module.previewProps
    const [html, text] = await Promise.all([
      render(component, props, { pretty: true }),
      render(component, props, { plainText: true }),
    ])
    return { html, text }
  }

  const sendJson = (res: ServerResponse, data: unknown) => {
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(data))
  }

  const readBody = async (req: IncomingMessage): Promise<Record<string, unknown>> => {
    const chunks: Buffer[] = []
    let total = 0
    for await (const chunk of req) {
      const buf = chunk as Buffer
      total += buf.byteLength
      if (total > MAX_BODY_BYTES) throw new Error('Request body too large')
      chunks.push(buf)
    }
    const raw = Buffer.concat(chunks).toString('utf8')
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
  }

  // CSRF / cross-origin guard for state-changing endpoints. Only same-origin
  // requests from the local dev UI may trigger a send. A cross-site page can
  // forge a simple POST but cannot set a trustworthy Origin to our host.
  const allowedHosts = new Set([`localhost:${port}`, `127.0.0.1:${port}`, `[::1]:${port}`])
  const isSameOrigin = (req: IncomingMessage): boolean => {
    const origin = req.headers.origin
    if (origin) {
      try {
        return allowedHosts.has(new URL(origin).host)
      } catch {
        return false
      }
    }
    // No Origin header (e.g. same-origin fetch in some browsers): fall back to Host.
    return req.headers.host ? allowedHosts.has(req.headers.host) : false
  }

  const server = createHttpServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`)
    void (async () => {
      try {
        switch (url.pathname) {
          case '/api/emails': {
            sendJson(res, await discoverEmails(emailsDir))
            return
          }
          case '/api/config': {
            sendJson(res, { sendTest: canSendTest(), from: defaultFrom() })
            return
          }
          case '/api/send': {
            if (req.method !== 'POST') {
              res.statusCode = 405
              sendJson(res, { error: 'POST only' })
              return
            }
            if (!isSameOrigin(req)) {
              res.statusCode = 403
              sendJson(res, { error: 'cross-origin request rejected' })
              return
            }
            try {
              const body = await readBody(req)
              const file = typeof body.file === 'string' ? body.file : ''
              const to = typeof body.to === 'string' ? body.to.trim() : ''
              if (!file || !to) {
                res.statusCode = 400
                sendJson(res, { error: 'missing file or recipient' })
                return
              }
              const { html, text } = await renderEmail(file)
              const subject = typeof body.subject === 'string' && body.subject ? body.subject : file
              sendJson(res, await sendTest({ to, subject, html, text }))
            } catch (error) {
              sendJson(res, { error: errorMessage(error) })
            }
            return
          }
          case '/api/preview': {
            const file = url.searchParams.get('file')
            if (!file) {
              res.statusCode = 400
              sendJson(res, { error: 'missing ?file' })
              return
            }
            try {
              const { html, text } = await renderEmail(file)
              const absolutePath = resolveEmailPath(emailsDir, file)
              const source = await readFile(absolutePath, 'utf8')
              const compatibility = lintHtml(html)
              sendJson(res, { html, text, source, absolutePath, compatibility })
            } catch (error) {
              sendJson(res, { error: errorMessage(error) })
            }
            return
          }
          case '/api/lint': {
            const file = url.searchParams.get('file')
            if (!file) {
              res.statusCode = 400
              sendJson(res, { error: 'missing ?file' })
              return
            }
            try {
              const { html } = await renderEmail(file)
              // Pin to our own origin — don't trust the client `Host` header.
              const base = `http://localhost:${port}`
              sendJson(res, { rows: await lintEmail(html, base) })
            } catch (error) {
              sendJson(res, { error: errorMessage(error) })
            }
            return
          }
          case '/api/spam': {
            const file = url.searchParams.get('file')
            if (!file) {
              res.statusCode = 400
              sendJson(res, { error: 'missing ?file' })
              return
            }
            try {
              const { html, text } = await renderEmail(file)
              sendJson(res, await checkSpam(html, text))
            } catch (error) {
              sendJson(res, { error: errorMessage(error) })
            }
            return
          }
          case '/preview': {
            const file = url.searchParams.get('file')
            res.setHeader('content-type', 'text/html; charset=utf-8')
            try {
              res.end((await renderEmail(file ?? '')).html)
            } catch (error) {
              res.statusCode = 500
              res.end(
                `<pre style="color:#b91c1c;padding:24px">${escapeHtml(errorMessage(error))}</pre>`,
              )
            }
            return
          }
          default: {
            await serveStatic(res, url.pathname)
          }
        }
      } catch (error) {
        res.statusCode = 500
        res.end(errorMessage(error))
      }
    })()
  })

  // Live reload: broadcast on any source change; the client re-fetches.
  const wss = new WebSocketServer({ server, path: '/__hmr' })
  const broadcast = (message: string) => {
    for (const client of wss.clients) {
      if (client.readyState === 1) client.send(message)
    }
  }
  const onChange = () => {
    vite.moduleGraph.invalidateAll()
    broadcast('reload')
  }
  vite.watcher.on('change', onChange)
  vite.watcher.on('add', onChange)
  vite.watcher.on('unlink', onChange)

  await new Promise<void>((resolve) => {
    server.listen(port, host, () => {
      const shown = host === '127.0.0.1' || host === '::1' ? 'localhost' : host
      // eslint-disable-next-line no-console
      console.log(
        `\n  vuemailer dev server running\n  → http://${shown}:${port}\n  emails: ${emailsDir}\n`,
      )
      resolve()
    })
  })
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message
  return String(error)
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'))
}
