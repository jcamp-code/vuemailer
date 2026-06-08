import type { HtmlToTextOptions } from 'html-to-text'

export interface Options {
  /**
   * Pretty-print the rendered HTML using prettier.
   * Ignored when `plainText` is `true`.
   */
  pretty?: boolean
  /**
   * Render the email as plain text instead of HTML.
   */
  plainText?: boolean
  /**
   * Options forwarded to the `html-to-text` library used for plain-text
   * conversion. Only relevant when `plainText` is `true`.
   *
   * @see https://github.com/html-to-text/node-html-to-text
   */
  htmlToTextOptions?: HtmlToTextOptions
}
