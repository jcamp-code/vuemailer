// Send-test support via Resend (mirrors react-email's "Send test email" UX).
// The whole feature is gated on RESEND_API_KEY being present in the dev server's
// environment — `canSendTest()` is reported to the UI so the button only shows
// when a send is actually possible. Override the From address with
// VUEMAILER_TEST_FROM (defaults to Resend's onboarding sandbox sender).

const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const DEFAULT_FROM = 'onboarding@resend.dev'

export function canSendTest(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

export function defaultFrom(): string {
  return process.env.VUEMAILER_TEST_FROM || DEFAULT_FROM
}

export interface SendTestInput {
  to: string
  subject: string
  html: string
  text: string
}

export interface SendResult {
  id?: string
  error?: string
}

interface ResendResponse {
  id?: string
  message?: string
  name?: string
}

export async function sendTest(input: SendTestInput): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { error: 'RESEND_API_KEY is not set' }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: defaultFrom(),
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    })
    const data = (await response.json()) as ResendResponse
    if (!response.ok) {
      return { error: data.message || data.name || `Resend responded ${response.status}` }
    }
    return { id: data.id }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}
