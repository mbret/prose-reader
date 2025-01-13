import { Reader, SpineItem } from "@prose-reader/core"
import { Observable, of } from "rxjs"
import { ResultItem } from "./types"

export type SearchResult = ResultItem[]

const searchNodeContainingText = (node: Node, text: string) => {
  const nodeList = node.childNodes

  if (node.nodeName === `head`) return []

  const rangeList: Range[] = []

  for (let i = 0; i < nodeList.length; i++) {
    const subNode = nodeList[i]

    if (!subNode) {
      continue
    }

    if (subNode?.hasChildNodes()) {
      rangeList.push(...searchNodeContainingText(subNode, text))
    }

    if (subNode.nodeType === 3) {
      const content = (subNode as Text).data.toLowerCase()
      if (content) {
        let match
        const regexp = RegExp(`(${text})`, `gi`)

        while ((match = regexp.exec(content)) !== null) {
          if (match.index >= 0 && subNode.ownerDocument) {
            const range = subNode.ownerDocument.createRange()
            range.setStart(subNode, match.index)
            range.setEnd(subNode, match.index + text.length)

            rangeList.push(range)
          }
        }
      }
    }
  }

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
    const { end, start } = reader.cfi.generateCfiFromRange(range, item.item)

    return {
      cfi: start,
      startCfi: start,
      endCfi: end,
    } satisfies ResultItem
  })

  return of(newResults)
}
