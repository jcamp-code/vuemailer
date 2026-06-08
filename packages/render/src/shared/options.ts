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
  /**
   * A post-processing hook applied to the final HTML output, after
   * pretty-printing and void-element self-closing. Use it to pipe the rendered
   * email through an external transformation pipeline — e.g. Maizzle, `juice`
   * CSS inlining, or your own transforms — without vuemailer taking a
   * dependency on any of them.
   *
   * Receives the rendered HTML and returns the transformed HTML (sync or async).
   * Ignored when `plainText` is `true`.
   *
   * @example
   * render(Email, props, { transform: (html) => juice(html) })
   */
  transform?: (html: string) => string | Promise<string>
}
