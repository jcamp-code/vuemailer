import { canonicalize, tokenizeForDiff } from './canonicalize'

function multisetDiff(a: string[], b: string[]): string[] {
  const counts = new Map<string, number>()
  for (const token of b) counts.set(token, (counts.get(token) ?? 0) + 1)
  const onlyInA: string[] = []
  for (const token of a) {
    const remaining = counts.get(token) ?? 0
    if (remaining > 0) counts.set(token, remaining - 1)
    else onlyInA.push(token)
  }
  return onlyInA
}

export interface ParityReport {
  similarity: number
  reactTokenCount: number
  vueTokenCount: number
  onlyInReact: string[]
  onlyInVue: string[]
}

/**
 * Canonicalizes both outputs, then reports a token-level similarity ratio and
 * the tokens unique to each side — a readable parity diff for whole emails.
 */
export function compareEmails(reactHtml: string, vueHtml: string): ParityReport {
  const reactTokens = tokenizeForDiff(canonicalize(reactHtml))
  const vueTokens = tokenizeForDiff(canonicalize(vueHtml))

  const counts = new Map<string, number>()
  for (const token of reactTokens) counts.set(token, (counts.get(token) ?? 0) + 1)
  let matches = 0
  for (const token of vueTokens) {
    const remaining = counts.get(token) ?? 0
    if (remaining > 0) {
      matches++
      counts.set(token, remaining - 1)
    }
  }

  const similarity = (2 * matches) / (reactTokens.length + vueTokens.length || 1)

  return {
    similarity,
    reactTokenCount: reactTokens.length,
    vueTokenCount: vueTokens.length,
    onlyInReact: multisetDiff(reactTokens, vueTokens),
    onlyInVue: multisetDiff(vueTokens, reactTokens),
  }
}

export function formatReport(report: ParityReport): string {
  const lines = [
    `similarity: ${(report.similarity * 100).toFixed(1)}% (react ${report.reactTokenCount} tokens, vue ${report.vueTokenCount} tokens)`,
  ]
  if (report.onlyInReact.length > 0) {
    lines.push(`only in react-email (${report.onlyInReact.length}):`)
    for (const token of report.onlyInReact) lines.push(`  - ${token}`)
  }
  if (report.onlyInVue.length > 0) {
    lines.push(`only in vuemailer (${report.onlyInVue.length}):`)
    for (const token of report.onlyInVue) lines.push(`  + ${token}`)
  }
  if (report.onlyInReact.length === 0 && report.onlyInVue.length === 0) {
    lines.push('identical after canonicalization ✅')
  }
  return lines.join('\n')
}
