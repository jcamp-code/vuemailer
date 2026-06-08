// Spam check via SpamAssassin. Mirrors react-email's spam-check UX (a
// user-triggered POST of the email to a hosted SpamAssassin service), but
// defaults to Postmark's free public Spamcheck API instead of react-email's
// own endpoint. Override the endpoint with VUEMAILER_SPAM_CHECK_URL.

const DEFAULT_ENDPOINT = 'https://spamcheck.postmarkapp.com/filter'
const SPAM_THRESHOLD = 5 // SpamAssassin's default

export interface SpamRule {
  name: string
  description: string
  points: number
}

export interface SpamResult {
  score: number
  isSpam: boolean
  threshold: number
  rules: SpamRule[]
  endpoint: string
  error?: string
}

/** Builds a well-formed RFC822 message so SpamAssassin scores the content, not missing headers. */
function buildRawEmail(html: string, text: string): string {
  const boundary = 'vuemailer-boundary-1f2e3d'
  const now = new Date().toUTCString()
  return [
    'From: sender@example.com',
    'To: recipient@example.com',
    'Subject: vuemailer preview',
    `Date: ${now}`,
    `Message-Id: <vuemailer-${now.replace(/\W+/g, '')}@example.com>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    text,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    '',
    html,
    '',
    `--${boundary}--`,
    '',
  ].join('\r\n')
}

const reportLineRegex = /^\s*(-?\d+(?:\.\d+)?)\s+([A-Z0-9_]+)\s+(.+?)\s*$/

function parseReport(report: string): SpamRule[] {
  const rules: SpamRule[] = []
  for (const line of report.split(/\r?\n/)) {
    const match = reportLineRegex.exec(line)
    if (match) {
      rules.push({ points: Number(match[1]), name: match[2]!, description: match[3]!.trim() })
    }
  }
  return rules
}

interface PostmarkResponse {
  success?: boolean
  message?: string
  score?: string | number
  report?: string
  rules?: Array<{ score: string; description: string }>
}

export async function checkSpam(html: string, text: string): Promise<SpamResult> {
  const endpoint = process.env.VUEMAILER_SPAM_CHECK_URL || DEFAULT_ENDPOINT
  const base: SpamResult = {
    score: 0,
    isSpam: false,
    threshold: SPAM_THRESHOLD,
    rules: [],
    endpoint,
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email: buildRawEmail(html, text), options: 'long' }),
    })
    const data = (await response.json()) as PostmarkResponse

    if (data.success === false) {
      return { ...base, error: data.message ?? 'Spam check failed' }
    }

    const score = Number(data.score ?? 0)
    const rules = data.report
      ? parseReport(data.report)
      : (data.rules ?? []).map((r) => ({
          name: r.description.split(':')[0]!.trim(),
          description: r.description,
          points: Number(r.score),
        }))
    rules.sort((a, b) => b.points - a.points)

    return { ...base, score, isSpam: score >= SPAM_THRESHOLD, rules }
  } catch (error) {
    return { ...base, error: error instanceof Error ? error.message : String(error) }
  }
}
