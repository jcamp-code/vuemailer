<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
  TabsContent,
  TabsList,
  TabsRoot,
  TabsTrigger,
} from 'reka-ui'
import { computed, onMounted, ref, watch } from 'vue'
import CodeBlock from './CodeBlock.vue'

interface EmailEntry {
  path: string
}
type Status = 'success' | 'warning' | 'error'
interface CompatFinding {
  slug: string
  title: string
  category: string
  url: string
  perClient: Record<string, Status>
  structural: boolean
  line: number
}
interface Compat {
  checkedFeatures: number
  issueCount: number
  findings: CompatFinding[]
  nicenames: Record<string, string>
  lastUpdate: string
  clients: string[]
}
interface LintRow {
  source: 'link' | 'image'
  status: 'warning' | 'error'
  type: string
  message: string
  target: string
  metadata: string[]
  line: number
}
interface SpamRule {
  name: string
  description: string
  points: number
}
interface SpamResult {
  score: number
  isSpam: boolean
  threshold: number
  rules: SpamRule[]
  endpoint: string
  error?: string
}
interface PreviewData {
  html?: string
  text?: string
  source?: string
  absolutePath?: string
  compatibility?: Compat
  error?: string
}

const statusIcon = (s?: Status) =>
  s === 'success' ? '✓' : s === 'warning' ? '~' : s === 'error' ? '✗' : '·'
const statusClass = (s?: Status) =>
  s === 'success'
    ? 'text-green-400'
    : s === 'warning'
      ? 'text-amber-400'
      : s === 'error'
        ? 'text-red-400'
        : 'text-gray-600'
const statusLabel = (s?: Status) =>
  s === 'success'
    ? 'Supported'
    : s === 'warning'
      ? 'Partial'
      : s === 'error'
        ? 'Not supported'
        : 'No data'

const emails = ref<EmailEntry[]>([])
const selected = ref<string | null>(null)
const detail = ref<PreviewData | null>(null)
const tab = ref<'preview' | 'html' | 'text' | 'code' | 'compat' | 'linter' | 'spam'>('preview')

// Email color scheme (light/dark), persisted across reloads.
const SCHEME_KEY = 'vuemailer:dark-email'
const darkEmail = ref(localStorage.getItem(SCHEME_KEY) === '1')

// Compatibility: hide unavoidable scaffolding (body/table/td/style/…) by default.
// react-email never surfaces these (it scans the source AST, not the rendered
// HTML), so suppressing them keeps the findings actionable. Persisted like the
// scheme toggle; default on (only off when explicitly stored as '0').
const HIDE_STRUCTURAL_KEY = 'vuemailer:hide-structural'
const hideStructural = ref(localStorage.getItem(HIDE_STRUCTURAL_KEY) !== '0')

// Line to highlight in the HTML tab (set when a compatibility finding is clicked).
const htmlHighlightLine = ref<number | null>(null)

// Send-test (Resend) — only enabled when the server reports a configured key.
const canSendTest = ref(false)
const sendFrom = ref('')
const sendTo = ref('')
const sendSubject = ref('')
const sending = ref(false)
const sendStatus = ref<{ ok: boolean; message: string } | null>(null)

// Resizable preview frame. `null` means "fill the pane".
const frameWidth = ref<number | null>(null)
const frameHeight = ref<number | null>(null)
const frameRef = ref<HTMLElement | null>(null)
const iframeEl = ref<HTMLIFrameElement | null>(null)
const resizing = ref(false)

// Authentic dark-mode emulation, OS-independent. The email iframe is same-origin,
// so on first sight we extract and DELETE every `@media (prefers-color-scheme: …)`
// rule (so the real OS setting no longer drives the email), remembering each
// scheme's inner rules. Toggling then injects the chosen scheme's rules — which
// already carry `!important` — into a controlled <style>, and sets `color-scheme`
// for UA defaults. This is how react-email simulates a dark email client.
interface SchemeRules {
  dark: string[]
  light: string[]
}
const schemeSnapshots = new WeakMap<Document, SchemeRules>()

function snapshotAndStrip(doc: Document): SchemeRules {
  const existing = schemeSnapshots.get(doc)
  if (existing) return existing

  const snap: SchemeRules = { dark: [], light: [] }
  // The rules live in the iframe's realm, so a parent-window `instanceof
  // CSSMediaRule` is always false — match on the stable numeric rule type instead.
  for (const sheet of Array.from(doc.styleSheets)) {
    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch {
      continue // cross-origin (e.g. remote font) — skip
    }
    // Iterate backwards so deleteRule indices stay valid.
    for (let i = rules.length - 1; i >= 0; i--) {
      const rule = rules[i] as CSSRule
      // MEDIA_RULE === 4, stable across realms (avoids cross-realm instanceof).
      if (rule.type !== 4) continue
      const mediaRule = rule as CSSMediaRule
      const media = mediaRule.media.mediaText
      const isDark = /prefers-color-scheme\s*:\s*dark/i.test(media)
      const isLight = /prefers-color-scheme\s*:\s*light/i.test(media)
      if (!isDark && !isLight) continue
      for (const inner of Array.from(mediaRule.cssRules)) {
        ;(isDark ? snap.dark : snap.light).push(inner.cssText)
      }
      try {
        sheet.deleteRule(i)
      } catch {
        // ignore
      }
    }
  }
  schemeSnapshots.set(doc, snap)
  return snap
}

function applyColorScheme() {
  const doc = iframeEl.value?.contentDocument
  if (!doc?.documentElement || !doc.head) return

  const snap = snapshotAndStrip(doc)
  doc.documentElement.style.colorScheme = darkEmail.value ? 'dark' : 'light'

  doc.getElementById('__vuemailer-scheme')?.remove()
  const css = (darkEmail.value ? snap.dark : snap.light).join('\n')
  if (css) {
    const style = doc.createElement('style')
    style.id = '__vuemailer-scheme'
    style.textContent = css
    doc.head.appendChild(style)
  }

  // Emails rarely fill the viewport, so the iframe's own background shows below
  // the content. Match it to the (now-resolved) body background so the whole
  // preview area reflects the chosen scheme rather than staying white.
  if (doc.body && iframeEl.value) {
    iframeEl.value.style.backgroundColor = getComputedStyle(doc.body).backgroundColor
  }
}

const version = ref(0)
const copied = ref(false)

// Linter (link + image checks) — loaded lazily since it hits the network.
const lintRows = ref<LintRow[] | null>(null)
const lintLoading = ref(false)

// Spam check (SpamAssassin) — also network-bound and lazy.
const spamResult = ref<SpamResult | null>(null)
const spamLoading = ref(false)

const sourceLang = computed(() => {
  const path = selected.value ?? ''
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript'
  if (path.endsWith('.js') || path.endsWith('.jsx') || path.endsWith('.mjs')) return 'javascript'
  return 'markup'
})

const iframeSrc = computed(() =>
  selected.value
    ? `/preview?file=${encodeURIComponent(selected.value)}&v=${version.value}`
    : 'about:blank',
)

const sizeLabel = computed(() => {
  const w = frameWidth.value ? `${frameWidth.value}` : 'auto'
  const h = frameHeight.value ? `${frameHeight.value}` : 'auto'
  return `${w} × ${h}`
})

// Compatibility findings after the structural filter.
const allFindings = computed<CompatFinding[]>(() => detail.value?.compatibility?.findings ?? [])
const structuralCount = computed(() => allFindings.value.filter((f) => f.structural).length)
const visibleFindings = computed(() =>
  hideStructural.value ? allFindings.value.filter((f) => !f.structural) : allFindings.value,
)

async function loadEmails() {
  emails.value = await fetch('/api/emails').then((r) => r.json())
  if (!selected.value && emails.value.length > 0) {
    void select(emails.value[0]!.path)
  }
}

async function loadDetail() {
  if (!selected.value) return
  detail.value = await fetch(`/api/preview?file=${encodeURIComponent(selected.value)}`).then((r) =>
    r.json(),
  )
}

async function select(path: string) {
  selected.value = path
  detail.value = null
  lintRows.value = null
  spamResult.value = null
  htmlHighlightLine.value = null
  sendStatus.value = null
  await loadDetail()
}

async function loadLint() {
  if (!selected.value) return
  lintLoading.value = true
  try {
    const res = await fetch(`/api/lint?file=${encodeURIComponent(selected.value)}`)
    const data = await res.json()
    lintRows.value = data.rows ?? []
  } finally {
    lintLoading.value = false
  }
}

async function loadSpam() {
  if (!selected.value) return
  spamLoading.value = true
  try {
    const res = await fetch(`/api/spam?file=${encodeURIComponent(selected.value)}`)
    spamResult.value = await res.json()
  } finally {
    spamLoading.value = false
  }
}

// ---- Copy for AI (ported from react-email's copy-for-ai) -------------------
const aiCopied = ref(false)
const CHATGPT_MAX_URL = 7500

function promptLang(): string {
  const p = selected.value ?? ''
  if (p.endsWith('.ts') || p.endsWith('.tsx')) return 'ts'
  if (p.endsWith('.js') || p.endsWith('.jsx') || p.endsWith('.mjs')) return 'js'
  return 'vue'
}

function buildLinterPrompt(): string {
  const rows = lintRows.value
  if (!rows || rows.length === 0) return ''
  const issues = rows.map(
    (r) => `- [${r.type.toUpperCase()}] ${r.message} → ${r.target} (line ${r.line})`,
  )
  return `I have an email template with the following issues found by the email preview tool's linter. Please help me fix each one:

${issues.join('\n')}

For each issue:
1. Explain what the problem is and why it matters for email deliverability
2. Provide the corrected code
3. If an image is missing alt text, suggest descriptive alt text based on context
4. If a link or image is broken, suggest how to verify and fix the URL
5. If using HTTP instead of HTTPS, update to the secure version`
}

function buildCompatPrompt(): string {
  const compat = detail.value?.compatibility
  const findings = visibleFindings.value
  if (!compat || findings.length === 0) return ''
  const issues = findings.map((f) => {
    const unsupported = compat.clients
      .filter((c) => f.perClient[c] === 'error')
      .map((c) => compat.nicenames[c] || c)
    return `- "${f.title}" is not supported in: ${unsupported.join(', ')}`
  })
  return `I have an email template with CSS/HTML compatibility issues detected by Can I Email. These features don't work in certain email clients:

${issues.join('\n')}

For each compatibility issue:
1. Explain which email clients are affected and how they'll render it
2. Provide a fallback or alternative approach that works across all email clients
3. Use only email-safe CSS properties and HTML elements
4. Prefer table-based layouts and inline styles for maximum compatibility`
}

function buildSpamPrompt(): string {
  const spam = spamResult.value
  if (!spam || spam.error) return ''
  const failing = spam.rules.filter((r) => r.points > 0).sort((a, b) => b.points - a.points)
  if (failing.length === 0) return ''
  const list = failing
    .map((c) => `- [${c.name}] (penalty: ${c.points.toFixed(1)}) ${c.description}`)
    .join('\n')
  return `I have an email template that scored ${spam.score.toFixed(1)} on SpamAssassin's spam check (${spam.threshold}+ is flagged as spam). Here are the spam indicators found:

${list}

For each spam indicator:
1. Explain why this pattern triggers spam filters
2. Suggest specific changes to the content or structure to fix it
3. Prioritize fixes by impact — tackle the highest-penalty items first`
}

const aiPrompt = computed(() => {
  let issue = ''
  if (tab.value === 'linter') issue = buildLinterPrompt()
  else if (tab.value === 'compat') issue = buildCompatPrompt()
  else if (tab.value === 'spam') issue = buildSpamPrompt()
  else issue = [buildCompatPrompt(), buildLinterPrompt(), buildSpamPrompt()].filter(Boolean).join('\n\n---\n\n')

  const lang = promptLang()
  const source = detail.value?.source ?? ''
  if (!issue) {
    return `Here is the source code of my vuemailer email template:\n\n\`\`\`${lang}\n${source}\n\`\`\`\n\nHelp me review and improve this email template.`
  }
  return `${issue}\n\nHere is the source code of my email template:\n\n\`\`\`${lang}\n${source}\n\`\`\``
})

function copyPrompt() {
  navigator.clipboard.writeText(aiPrompt.value)
  aiCopied.value = true
  setTimeout(() => (aiCopied.value = false), 1500)
}
function openCursor() {
  window.location.href = `cursor://prompt?text=${encodeURIComponent(aiPrompt.value)}`
}
function openClaude() {
  window.open(`https://claude.ai/new?q=${encodeURIComponent(aiPrompt.value)}`, '_blank')
}
function openChatGPT() {
  const url = `https://chatgpt.com/?q=${encodeURIComponent(aiPrompt.value)}`
  if (url.length > CHATGPT_MAX_URL) {
    navigator.clipboard.writeText(aiPrompt.value)
    window.open('https://chatgpt.com/', '_blank')
  } else {
    window.open(url, '_blank')
  }
}

async function copyHtml() {
  if (!detail.value?.html) return
  await navigator.clipboard.writeText(detail.value.html)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

// Jump from a compatibility finding to where it lands in the rendered HTML.
// (We lint the rendered output, not the source AST, so the location is the
// HTML line — the faithful equivalent of react-email's source-link.)
function jumpToHtml(line: number) {
  // Force a change so re-clicking the same line still re-scrolls.
  htmlHighlightLine.value = null
  tab.value = 'html'
  requestAnimationFrame(() => {
    htmlHighlightLine.value = line
  })
}

async function loadConfig() {
  try {
    const cfg = await fetch('/api/config').then((r) => r.json())
    canSendTest.value = Boolean(cfg.sendTest)
    sendFrom.value = cfg.from ?? ''
  } catch {
    canSendTest.value = false
  }
}

async function sendTestEmail() {
  if (!selected.value || !sendTo.value.trim()) return
  sending.value = true
  sendStatus.value = null
  try {
    const res = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: selected.value,
        to: sendTo.value.trim(),
        subject: sendSubject.value.trim() || undefined,
      }),
    }).then((r) => r.json())
    sendStatus.value = res.error
      ? { ok: false, message: res.error }
      : { ok: true, message: `Sent ✓${res.id ? ` (${res.id})` : ''}` }
  } catch (error) {
    sendStatus.value = { ok: false, message: error instanceof Error ? error.message : String(error) }
  } finally {
    sending.value = false
  }
}

function setPreset(width: number | null) {
  frameWidth.value = width
  frameHeight.value = null
}

function openInBrowser() {
  if (selected.value) window.open(`/preview?file=${encodeURIComponent(selected.value)}`, '_blank')
}

function openInEditor() {
  if (detail.value?.absolutePath) {
    window.open(`vscode://file${detail.value.absolutePath}`, '_self')
  }
}

function setWidth(event: Event) {
  const value = (event.target as HTMLInputElement).value
  frameWidth.value = value ? Number(value) : null
}

function setHeight(event: Event) {
  const value = (event.target as HTMLInputElement).value
  frameHeight.value = value ? Number(value) : null
}

function startResize(axis: 'x' | 'y' | 'both', event: MouseEvent) {
  event.preventDefault()
  const rect = frameRef.value?.getBoundingClientRect()
  if (!rect) return
  const startX = event.clientX
  const startY = event.clientY
  const startW = rect.width
  const startH = rect.height
  resizing.value = true

  const onMove = (e: MouseEvent) => {
    if (axis === 'x' || axis === 'both') {
      frameWidth.value = Math.max(200, Math.round(startW + (e.clientX - startX)))
    }
    if (axis === 'y' || axis === 'both') {
      frameHeight.value = Math.max(200, Math.round(startH + (e.clientY - startY)))
    }
  }
  const onUp = () => {
    resizing.value = false
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

onMounted(() => {
  // The preview UI is dark by default.
  document.documentElement.classList.add('dark')

  loadConfig()
  loadEmails()
  const ws = new WebSocket(
    `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/__hmr`,
  )
  ws.onmessage = (event) => {
    if (event.data === 'reload') {
      version.value++
      loadEmails()
      loadDetail()
    }
  }
})

watch(selected, () => {
  // Reset the frame size when switching emails.
  frameWidth.value = null
  frameHeight.value = null
})

watch(darkEmail, (value) => {
  localStorage.setItem(SCHEME_KEY, value ? '1' : '0')
  applyColorScheme()
})

watch(hideStructural, (value) => {
  localStorage.setItem(HIDE_STRUCTURAL_KEY, value ? '1' : '0')
})

watch(tab, (value) => {
  if (value === 'linter' && lintRows.value === null && !lintLoading.value) loadLint()
  if (value === 'spam' && spamResult.value === null && !spamLoading.value) loadSpam()
})

const tabs = [
  { value: 'preview', label: 'Preview' },
  { value: 'html', label: 'HTML' },
  { value: 'text', label: 'Plain Text' },
  { value: 'code', label: 'Source' },
  { value: 'compat', label: 'Compatibility' },
  { value: 'linter', label: 'Linter' },
  { value: 'spam', label: 'Spam' },
] as const

const handleClass =
  'absolute z-10 bg-transparent transition-colors hover:bg-blue-500/60'
</script>

<template>
  <div class="flex h-full bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
    <!-- Sidebar -->
    <aside class="w-64 shrink-0 overflow-y-auto border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div class="flex items-center gap-2 px-4 py-3 text-sm font-semibold">
        <span class="text-blue-600 dark:text-blue-400">✉</span> vuemailer
      </div>
      <nav class="px-2 pb-4">
        <button
          v-for="email in emails"
          :key="email.path"
          class="block w-full truncate rounded px-2 py-1.5 text-left text-sm"
          :class="
            selected === email.path
              ? 'bg-blue-100 font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
          "
          @click="select(email.path)"
        >
          {{ email.path }}
        </button>
        <p v-if="emails.length === 0" class="px-2 py-4 text-sm text-gray-400">No emails found.</p>
      </nav>
    </aside>

    <!-- Main -->
    <TabsRoot v-model="tab" class="flex min-w-0 flex-1 flex-col">
      <header class="flex items-center gap-2 border-b border-gray-200 px-4 py-2 dark:border-gray-800">
        <TabsList class="flex gap-1">
          <TabsTrigger
            v-for="t in tabs"
            :key="t.value"
            :value="t.value"
            class="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 data-[state=active]:bg-blue-600 data-[state=active]:text-white dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {{ t.label }}
          </TabsTrigger>
        </TabsList>

        <span class="ml-auto truncate text-xs text-gray-400">{{ selected }}</span>

        <button
          v-if="tab === 'html'"
          class="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          @click="copyHtml"
        >
          {{ copied ? 'Copied!' : 'Copy HTML' }}
        </button>

        <DropdownMenuRoot>
          <DropdownMenuTrigger
            class="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {{ aiCopied ? 'Copied!' : 'Copy for AI' }}
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent
              :side-offset="6"
              align="end"
              class="z-50 min-w-56 rounded-lg border border-gray-200 bg-white p-1 text-sm shadow-xl dark:border-gray-700 dark:bg-gray-900"
            >
              <DropdownMenuItem
                class="flex cursor-pointer items-center justify-between rounded px-2 py-1.5 outline-none hover:bg-gray-100 dark:hover:bg-gray-800"
                @select="copyPrompt"
              >
                <span>Copy prompt</span>
                <span class="text-xs text-gray-400">Markdown</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                class="flex cursor-pointer items-center justify-between rounded px-2 py-1.5 outline-none hover:bg-gray-100 dark:hover:bg-gray-800"
                @select="openCursor"
              >
                <span>Open in Cursor</span><span class="text-gray-400">↗</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                class="flex cursor-pointer items-center justify-between rounded px-2 py-1.5 outline-none hover:bg-gray-100 dark:hover:bg-gray-800"
                @select="openClaude"
              >
                <span>Open in Claude</span><span class="text-gray-400">↗</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                class="flex cursor-pointer items-center justify-between rounded px-2 py-1.5 outline-none hover:bg-gray-100 dark:hover:bg-gray-800"
                @select="openChatGPT"
              >
                <span>Open in ChatGPT</span><span class="text-gray-400">↗</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenuRoot>

        <PopoverRoot v-if="canSendTest">
          <PopoverTrigger
            class="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Send test
          </PopoverTrigger>
          <PopoverPortal>
            <PopoverContent
              :side-offset="6"
              align="end"
              class="z-50 w-72 rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-xl dark:border-gray-700 dark:bg-gray-900"
            >
              <p class="mb-2 text-xs text-gray-500">
                Sends the rendered email via Resend from
                <span class="font-mono text-gray-400">{{ sendFrom }}</span>
              </p>
              <label class="mb-1 block text-xs text-gray-400">Recipient</label>
              <input
                v-model="sendTo"
                type="email"
                placeholder="you@example.com"
                class="mb-2 w-full rounded border border-gray-200 bg-transparent px-2 py-1 text-sm dark:border-gray-700"
                @keydown.enter="sendTestEmail"
              />
              <label class="mb-1 block text-xs text-gray-400">Subject (optional)</label>
              <input
                v-model="sendSubject"
                type="text"
                :placeholder="selected ?? ''"
                class="mb-3 w-full rounded border border-gray-200 bg-transparent px-2 py-1 text-sm dark:border-gray-700"
                @keydown.enter="sendTestEmail"
              />
              <button
                class="w-full rounded bg-blue-600 px-2 py-1.5 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
                :disabled="sending || !sendTo.trim()"
                @click="sendTestEmail"
              >
                {{ sending ? 'Sending…' : 'Send' }}
              </button>
              <p
                v-if="sendStatus"
                class="mt-2 text-xs"
                :class="sendStatus.ok ? 'text-green-400' : 'text-red-400'"
              >
                {{ sendStatus.message }}
              </p>
            </PopoverContent>
          </PopoverPortal>
        </PopoverRoot>
      </header>

      <!-- Contextual sub-bar: viewport + scheme + open-in controls (Preview only) -->
      <div
        v-if="tab === 'preview'"
        class="flex items-center gap-2 border-b border-gray-200 px-4 py-1.5 dark:border-gray-800"
      >
        <div class="flex overflow-hidden rounded border border-gray-200 dark:border-gray-700">
          <button
            class="px-2 py-1 text-xs"
            :class="frameWidth === null ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300'"
            @click="setPreset(null)"
          >
            Desktop
          </button>
          <button
            class="px-2 py-1 text-xs"
            :class="frameWidth === 600 ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300'"
            @click="setPreset(600)"
          >
            600
          </button>
          <button
            class="px-2 py-1 text-xs"
            :class="frameWidth === 375 ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300'"
            @click="setPreset(375)"
          >
            Mobile
          </button>
        </div>
        <div class="flex items-center gap-1 text-xs text-gray-400">
          <input
            type="number"
            min="0"
            placeholder="auto"
            :value="frameWidth ?? ''"
            class="w-16 rounded border border-gray-200 bg-transparent px-1 py-0.5 dark:border-gray-700"
            @input="setWidth"
          />
          <span>×</span>
          <input
            type="number"
            min="0"
            placeholder="auto"
            :value="frameHeight ?? ''"
            class="w-16 rounded border border-gray-200 bg-transparent px-1 py-0.5 dark:border-gray-700"
            @input="setHeight"
          />
        </div>
        <button
          class="rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-700"
          :title="darkEmail ? 'Email on light background' : 'Email on dark background'"
          @click="darkEmail = !darkEmail"
        >
          {{ darkEmail ? '🌙 Dark' : '☀ Light' }}
        </button>

        <div class="ml-auto flex items-center gap-2">
          <button
            class="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            title="Open rendered email in a new tab"
            @click="openInBrowser"
          >
            Browser
          </button>
          <button
            class="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            title="Open source in VS Code"
            @click="openInEditor"
          >
            Editor
          </button>
        </div>
      </div>

      <div class="min-h-0 flex-1">
        <p v-if="detail?.error" class="whitespace-pre-wrap p-6 font-mono text-sm text-red-600">
          {{ detail.error }}
        </p>

        <TabsContent
          value="preview"
          class="h-full"
          :class="darkEmail ? 'bg-gray-900' : 'bg-gray-100'"
        >
          <div class="flex h-full items-start justify-center overflow-auto p-6">
            <div
              ref="frameRef"
              class="relative shrink-0"
              :style="{
                width: frameWidth ? `${frameWidth}px` : '100%',
                height: frameHeight ? `${frameHeight}px` : '100%',
              }"
            >
              <iframe
                ref="iframeEl"
                :src="iframeSrc"
                :style="{ pointerEvents: resizing ? 'none' : 'auto' }"
                class="h-full w-full rounded border border-gray-300 bg-white shadow-lg dark:border-gray-700"
                title="email preview"
                @load="applyColorScheme"
              />
              <!-- Resize handles -->
              <div
                :class="handleClass"
                class="top-0 -right-1 h-full w-2 cursor-ew-resize"
                @mousedown="startResize('x', $event)"
              />
              <div
                :class="handleClass"
                class="-bottom-1 left-0 h-2 w-full cursor-ns-resize"
                @mousedown="startResize('y', $event)"
              />
              <div
                class="absolute -right-1 -bottom-1 z-20 h-3 w-3 cursor-nwse-resize rounded-sm bg-blue-500/70 hover:bg-blue-500"
                @mousedown="startResize('both', $event)"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="html" class="h-full">
          <CodeBlock
            v-if="detail?.html"
            :code="detail.html"
            lang="markup"
            :highlight-line="htmlHighlightLine"
          />
        </TabsContent>

        <TabsContent value="text" class="h-full">
          <pre class="m-0 h-full overflow-auto p-4 font-mono text-sm whitespace-pre-wrap dark:bg-gray-950">{{ detail?.text }}</pre>
        </TabsContent>

        <TabsContent value="code" class="h-full">
          <CodeBlock v-if="detail?.source" :code="detail.source" :lang="sourceLang" />
        </TabsContent>

        <TabsContent value="compat" class="h-full overflow-auto">
          <div v-if="detail?.compatibility" class="p-4">
            <div class="mb-4 flex items-center gap-3 text-sm text-gray-400">
              <p>
                <span class="font-medium text-gray-200">{{ visibleFindings.length }}</span>
                compatibility issue(s) across
                <span class="font-medium text-gray-200">{{ detail.compatibility.checkedFeatures }}</span>
                detected feature(s) ·
                <a
                  class="text-blue-400 hover:underline"
                  href="https://www.caniemail.com"
                  target="_blank"
                >
                  caniemail
                </a>
                data {{ detail.compatibility.lastUpdate }}
              </p>
              <button
                v-if="structuralCount > 0 || !hideStructural"
                class="ml-auto shrink-0 rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                :title="
                  hideStructural
                    ? 'Showing actionable issues; click to include structural primitives (body, table, style, …)'
                    : 'Showing all issues; click to hide structural primitives (body, table, style, …)'
                "
                @click="hideStructural = !hideStructural"
              >
                {{
                  hideStructural
                    ? `Show structural (${structuralCount})`
                    : 'Hide structural'
                }}
              </button>
            </div>

            <p v-if="visibleFindings.length === 0" class="text-sm text-green-400">
              No
              <template v-if="hideStructural && structuralCount > 0">actionable</template>
              compatibility issues detected in
              {{ detail.compatibility.clients.length }} major clients 🎉
              <template v-if="hideStructural && structuralCount > 0">
                <br />
                <span class="text-gray-500">
                  ({{ structuralCount }} structural primitive(s) hidden — these are unavoidable
                  email scaffolding.)
                </span>
              </template>
            </p>

            <table v-else class="w-full border-collapse text-left text-sm">
              <thead>
                <tr class="text-xs text-gray-500">
                  <th class="py-2 pr-4 font-medium">Feature</th>
                  <th
                    v-for="client in detail.compatibility.clients"
                    :key="client"
                    class="px-2 py-2 text-center font-medium"
                  >
                    {{ detail.compatibility.nicenames[client] || client }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="finding in visibleFindings"
                  :key="finding.slug"
                  class="border-t border-gray-800"
                >
                  <td class="py-2 pr-4">
                    <span class="text-red-400">●</span>
                    <a :href="finding.url" target="_blank" class="hover:underline">
                      {{ finding.title }}
                    </a>
                    <span class="ml-1 text-xs text-gray-600">{{ finding.category }}</span>
                    <span
                      v-if="finding.structural"
                      class="ml-1 rounded bg-gray-800 px-1 py-0.5 text-[10px] text-gray-400"
                      title="Unavoidable email scaffolding — hidden by default"
                    >
                      structural
                    </span>
                    <button
                      class="ml-1 font-mono text-xs text-blue-400 hover:underline"
                      title="Jump to this line in the rendered HTML"
                      @click="jumpToHtml(finding.line)"
                    >
                      L{{ finding.line }}
                    </button>
                  </td>
                  <td
                    v-for="client in detail.compatibility.clients"
                    :key="client"
                    class="px-2 py-2 text-center"
                  >
                    <span
                      :class="statusClass(finding.perClient[client])"
                      :title="statusLabel(finding.perClient[client])"
                    >
                      {{ statusIcon(finding.perClient[client]) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="p-6 text-gray-500">No data.</p>
        </TabsContent>

        <TabsContent value="linter" class="h-full overflow-auto">
          <div class="p-4">
            <div class="mb-4 flex items-center gap-3 text-sm text-gray-400">
              <span>Link &amp; image checks</span>
              <button
                class="rounded border border-gray-200 px-2 py-0.5 text-xs disabled:opacity-50 dark:border-gray-700"
                :disabled="lintLoading"
                @click="loadLint"
              >
                {{ lintLoading ? 'Checking…' : 'Re-run' }}
              </button>
            </div>

            <p v-if="lintLoading && !lintRows" class="text-sm text-gray-500">
              Running link &amp; image checks…
            </p>
            <p v-else-if="lintRows && lintRows.length === 0" class="text-sm text-green-400">
              No link or image issues found 🎉
            </p>
            <ul v-else-if="lintRows" class="space-y-1">
              <li
                v-for="(row, i) in lintRows"
                :key="i"
                class="flex items-start gap-3 border-t border-gray-800 py-2 text-sm"
              >
                <span :class="row.status === 'error' ? 'text-red-400' : 'text-amber-400'">●</span>
                <div class="min-w-0 flex-1">
                  <div class="text-xs tracking-wide text-gray-500 uppercase">
                    {{ row.source }} · {{ row.type }}
                  </div>
                  <div :class="row.status === 'error' ? 'text-red-300' : 'text-amber-200'">
                    {{ row.message }}
                  </div>
                  <div class="truncate text-xs text-gray-500">{{ row.target }}</div>
                </div>
                <div class="shrink-0 text-right font-mono text-xs text-gray-500">
                  <span v-for="(m, mi) in row.metadata" :key="mi">{{ mi ? ' · ' : '' }}{{ m }}</span>
                  <span v-if="row.metadata.length"> · </span>L{{ row.line }}
                </div>
              </li>
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="spam" class="h-full overflow-auto">
          <div class="p-4">
            <div class="mb-4 flex items-center gap-3 text-sm text-gray-400">
              <span>SpamAssassin check</span>
              <button
                class="rounded border border-gray-200 px-2 py-0.5 text-xs disabled:opacity-50 dark:border-gray-700"
                :disabled="spamLoading"
                @click="loadSpam"
              >
                {{ spamLoading ? 'Checking…' : 'Re-run' }}
              </button>
            </div>

            <p v-if="spamLoading && !spamResult" class="text-sm text-gray-500">
              Running SpamAssassin…
            </p>
            <template v-else-if="spamResult">
              <p v-if="spamResult.error" class="text-sm text-red-400">{{ spamResult.error }}</p>
              <template v-else>
                <div class="mb-4 flex items-center gap-3">
                  <span
                    class="text-3xl font-semibold"
                    :class="spamResult.isSpam ? 'text-red-400' : 'text-green-400'"
                  >
                    {{ spamResult.score.toFixed(1) }}
                  </span>
                  <span class="text-sm text-gray-500">/ {{ spamResult.threshold }} threshold</span>
                  <span
                    class="rounded px-2 py-0.5 text-xs"
                    :class="
                      spamResult.isSpam ? 'bg-red-950 text-red-300' : 'bg-green-950 text-green-300'
                    "
                  >
                    {{ spamResult.isSpam ? 'Likely spam' : 'Looks clean' }}
                  </span>
                </div>

                <p v-if="spamResult.rules.length === 0" class="text-sm text-gray-500">
                  No SpamAssassin rules triggered.
                </p>
                <table v-else class="w-full text-left text-sm">
                  <thead>
                    <tr class="text-xs text-gray-500">
                      <th class="py-2 pr-3 text-right font-medium">Points</th>
                      <th class="px-3 font-medium">Rule</th>
                      <th class="font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="rule in spamResult.rules"
                      :key="rule.name"
                      class="border-t border-gray-800"
                    >
                      <td
                        class="py-1.5 pr-3 text-right font-mono"
                        :class="rule.points > 0 ? 'text-amber-300' : 'text-gray-600'"
                      >
                        {{ rule.points > 0 ? '+' : '' }}{{ rule.points.toFixed(1) }}
                      </td>
                      <td class="px-3 font-mono text-xs text-gray-400">{{ rule.name }}</td>
                      <td class="text-gray-300">{{ rule.description }}</td>
                    </tr>
                  </tbody>
                </table>
                <p class="mt-4 text-xs text-gray-600">via {{ spamResult.endpoint }}</p>
              </template>
            </template>
          </div>
        </TabsContent>
      </div>
    </TabsRoot>
  </div>
</template>
