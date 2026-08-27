import type { Reader, SpineItem } from "@prose-reader/core"
import { type Observable, of } from "rxjs"
import type { ResultItem } from "./types"

export type SearchResult = ResultItem[]

/**
 * Walk the subtree accumulating ranges for every match of `regexp`.
 *
 * A full-book search runs this over the rendered document of *every* spine
 * item, so the text-node loop below is the hot path (thousands of text nodes
 * per large chapter). Two things are hoisted out of it to keep the work
 * proportional to the number of matches rather than the number of nodes:
 * - the search regexp is compiled once by the caller and reused across every
 *   node (only its `lastIndex` is reset), instead of recompiling per text node,
 * - matches are pushed into a single shared array instead of allocating a new
 *   array at each node and spreading child results upward.
 */
const collectMatchingRanges = (
  node: Node,
  regexp: RegExp,
  rangeList: Range[],
) => {
  if (node.nodeName === `head`) return

  const nodeList = node.childNodes

  for (let i = 0; i < nodeList.length; i++) {
    const subNode = nodeList[i]

    if (!subNode) {
      continue
    }

    if (subNode.hasChildNodes()) {
      collectMatchingRanges(subNode, regexp, rangeList)
    }

    if (subNode.nodeType === 3) {
      // Match against the node data as-is: lowercasing here would shift match
      // indices for characters whose lowercase form has a different length
      // (e.g. İ), while the regexp already matches case-insensitively with
      // Unicode simple case folding (`iu` flags).
      const content = (subNode as Text).data
      if (content) {
        let match: RegExpExecArray | null = null
        regexp.lastIndex = 0

        // biome-ignore lint/suspicious/noAssignInExpressions: TODO
        while ((match = regexp.exec(content)) !== null) {
          if (match.index >= 0 && subNode.ownerDocument) {
            const range = subNode.ownerDocument.createRange()
            range.setStart(subNode, match.index)
            range.setEnd(subNode, match.index + match[0].length)

            rangeList.push(range)
          }
        }
      }
    }
  }
}

// The user query is literal text, not a pattern: metacharacters left
// unescaped either throw at RegExp construction (`c++`) or match the wrong
// content (`c.t`).
const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, `\\$&`)

const searchNodeContainingText = (node: Node, text: string) => {
  const rangeList: Range[] = []

  // `u` widens the `i` flag to Unicode simple case folding (K/K, Deseret…).
  // Characters only reachable through full case folding (İ → i̇) stay
  // unmatched on purpose: mapping their ranges back to the original text
  // would require a fold-index map on this hot path.
  collectMatchingRanges(node, RegExp(escapeRegExp(text), `giu`), rangeList)

  return rangeList
}

export const searchInDocument = (
  reader: Reader,
  item: SpineItem,
  doc: Document,
  text: string,
): Observable<SearchResult> => {
  const ranges = searchNodeContainingText(doc, text)

  const newResults = ranges.map((range) => {
    const cfi = reader.cfi.generateCfiFromRange(range, item.item)

    return {
      cfi,
    } satisfies ResultItem
  })

  return of(newResults)
}
