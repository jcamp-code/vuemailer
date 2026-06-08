/**
 * Strips Vue SSR/dev artifacts and non-email-friendly wrappers from the
 * rendered markup before it is handed back to the caller.
 */
export function cleanup(str: string): string {
  if (!str || typeof str !== 'string') return str

  return str
    .replace(/ data-v-inspector="[^"]*"/g, '')
    .replace(/<!---->/g, '')
    .replace(/<!--\[-->/g, '')
    .replace(/<!--\]-->/g, '')
    .replace(/<!--teleport (?:start|end)[^>]*-->/g, '')
    .replace(/<template>/g, '')
    .replace(/<template[^>]*>/g, '')
    .replace(/<\/template>/g, '')
    .replace(/<vuemailer-clean-component>/g, '')
    .replace(/<vuemailer-clean-component[^>]*>/g, '')
    .replace(/<\/vuemailer-clean-component>/g, '')
}
