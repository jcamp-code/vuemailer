// Derived from react-email (MIT, Copyright (c) 2024 Plus Five Five, Inc).
// Uses prettier to format the rendered HTML while keeping IE/Outlook
// conditional comments (`<!--[if mso]>`) on a single line so they remain valid.
import type { Options, Plugin } from 'prettier'
import type { builders } from 'prettier/doc'

import * as html from 'prettier/plugins/html'
import { format } from 'prettier/standalone'

interface HtmlNode {
  type?: 'element' | 'text' | 'ieConditionalComment'
  kind?: 'element' | 'text' | 'ieConditionalComment' | 'root'
  name?: string
  sourceSpan: {
    start: { file: unknown[]; offset: number; line: number; col: number }
    end: { file: unknown[]; offset: number; line: number; col: number }
    details: null
  }
  parent?: HtmlNode
}

function getHtmlNode(path: { node?: HtmlNode; stack?: Array<Record<string, unknown>> }) {
  const topNode = path.node
  if (topNode) {
    return topNode
  }

  return path.stack?.[path.stack.length - 1] as unknown as HtmlNode
}

function recursivelyMapDoc(
  doc: builders.Doc,
  callback: (innerDoc: string | builders.DocCommand) => builders.Doc,
): builders.Doc {
  if (Array.isArray(doc)) {
    return doc.map((innerDoc) => recursivelyMapDoc(innerDoc, callback))
  }

  if (typeof doc === 'object') {
    if (doc.type === 'line') {
      return callback(doc.soft ? '' : ' ')
    }

    if (doc.type === 'group') {
      return {
        ...doc,
        contents: recursivelyMapDoc(doc.contents, callback),
        expandedStates: recursivelyMapDoc(doc.expandedStates, callback) as builders.Doc[],
      }
    }

    if ('contents' in doc) {
      return {
        ...doc,
        contents: recursivelyMapDoc(doc.contents, callback),
      }
    }

    if ('parts' in doc) {
      return {
        ...doc,
        parts: recursivelyMapDoc(doc.parts, callback) as builders.Doc[],
      }
    }

    if (doc.type === 'if-break') {
      return {
        ...doc,
        breakContents: recursivelyMapDoc(doc.breakContents, callback),
        flatContents: recursivelyMapDoc(doc.flatContents, callback),
      }
    }

    const nextDoc = { ...doc } as Record<string, unknown>
    for (const [key, value] of Object.entries(nextDoc)) {
      if (value && typeof value === 'object') {
        nextDoc[key] = recursivelyMapDoc(value as builders.Doc, callback)
      }
    }

    return nextDoc as unknown as builders.Doc
  }

  return callback(doc)
}

const modifiedHtml = { ...html } as Plugin
if (modifiedHtml.printers) {
  // The prettier HTML printer type is an index signature; cast to `any` so we
  // can wrap its `print` to keep IE/Outlook conditional comments single-line.
  const htmlPrinter = modifiedHtml.printers.html as any
  const previousPrint = htmlPrinter.print
  htmlPrinter.print = (path: any, options: any, print: any, args: any) => {
    const node = getHtmlNode(path)

    const rawPrintingResult = previousPrint(path, options, print, args)

    if (node?.type === 'ieConditionalComment' || node?.kind === 'ieConditionalComment') {
      const printingResult = recursivelyMapDoc(rawPrintingResult, (doc) => {
        if (typeof doc === 'object' && doc.type === 'line') {
          return doc.soft ? '' : ' '
        }

        return doc
      })

      return printingResult
    }

    return rawPrintingResult
  }
}

const defaults: Options = {
  endOfLine: 'lf',
  tabWidth: 2,
  plugins: [modifiedHtml],
  bracketSameLine: true,
  parser: 'html',
}

export const pretty = (str: string, options: Options = {}) => {
  return format(str.replaceAll('\0', ''), {
    ...defaults,
    ...options,
  })
}
