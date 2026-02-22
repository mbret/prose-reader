import type { PageEntry } from "../../../spine/Pages"
import type { SpineItem } from "../../../spineItem/SpineItem"
import { buildChapterInfoFromChain, safeDecode } from "./shared"
import type { ChapterInfo, FlatTocEntry, TocPathEntry } from "./types"

const createCollapsedRangeFromNode = ({
  doc,
  node,
  offset,
}: {
  doc: Document
  node: Node
  offset: number
}) => {
  const range = doc.createRange()

  if (
    node.nodeType === Node.TEXT_NODE ||
    node.nodeType === Node.CDATA_SECTION_NODE ||
    node.nodeType === Node.COMMENT_NODE
  ) {
    const textNode = node as CharacterData
    const clampedOffset = Math.max(0, Math.min(offset, textNode.length))
    range.setStart(textNode, clampedOffset)
  } else {
    const maxOffset = node.childNodes.length
    const clampedOffset = Math.max(0, Math.min(offset, maxOffset))
    range.setStart(node, clampedOffset)
  }

  range.collapse(true)

  return range
}

const isRangeAtOrBeforeUpperBound = ({
  rangeToTest,
  upperBoundRange,
}: {
  rangeToTest: Range
  upperBoundRange: Range
}) => {
  return (
    rangeToTest.compareBoundaryPoints(Range.START_TO_START, upperBoundRange) < 0
  )
}

const createDocumentEndRange = (doc: Document) => {
  const range = doc.createRange()
  const container = doc.body ?? doc.documentElement

  if (!container) return undefined

  range.selectNodeContents(container)
  range.collapse(false)

  return range
}

const isAnchorAtNextPageBoundary = ({
  anchorNode,
  nextPageNode,
}: {
  anchorNode: Element
  nextPageNode: Node
}) => {
  return anchorNode === nextPageNode || anchorNode.contains(nextPageNode)
}

/**
 * Resolve chapter/subchapter by DOM order instead of layout position.
 *
 * Why:
 * - Avoid `getBoundingClientRect`/layout reads in chapter resolution.
 * - Keep result deterministic from document structure and TOC order.
 *
 * How:
 * - Use the next page first visible node as the upper bound of the current page.
 * - If there is no next page in the same spine item, use document end as upper bound.
 * - Keep the latest anchor candidate whose DOM position is strictly < upper bound.
 * - If no anchor candidate matches, fallback to the latest non-anchor chain.
 *
 * Pitfalls:
 * - Assumes DOM order reflects reading order. In documents with heavy absolute
 *   positioning, visual order can differ from DOM order.
 * - Requires anchors to exist in the loaded document (`getElementById`).
 * - If `nextPageEntry` exists but has no first visible node,
 *   we cannot infer current page upper bound reliably and return `undefined`.
 */
export const resolveChapterInfoFromVisibleNode = ({
  node,
  offset,
  candidates,
  spineItem,
  nextPageEntry,
}: {
  candidates: FlatTocEntry[]
  node: Node | undefined
  offset: number | undefined
  spineItem: SpineItem
  nextPageEntry: PageEntry | undefined
}): ChapterInfo | undefined => {
  if (!node || offset === undefined || !spineItem) return undefined
  if (candidates.length === 0) return undefined

  const doc = spineItem.renderer.getDocumentFrame()?.contentDocument
  if (!doc || node.ownerDocument !== doc) return undefined

  const nextPageNode = nextPageEntry?.firstVisibleNode?.node
  const nextPageOffset = nextPageEntry?.firstVisibleNode?.offset
  const upperBoundRange = nextPageEntry
    ? nextPageNode !== undefined &&
      nextPageOffset !== undefined &&
      nextPageNode.ownerDocument === doc
      ? createCollapsedRangeFromNode({
          doc,
          node: nextPageNode,
          offset: nextPageOffset,
        })
      : undefined
    : createDocumentEndRange(doc)

  if (!upperBoundRange) return undefined

  const hasUsableNextPageNode =
    nextPageEntry !== undefined &&
    nextPageNode !== undefined &&
    nextPageNode.ownerDocument === doc

  let bestAnchoredChain: TocPathEntry[] | undefined
  let bestAnchoredRange: Range | undefined
  let bestFallbackChain: TocPathEntry[] | undefined

  for (const candidate of candidates) {
    if (!candidate.anchorId) {
      bestFallbackChain = candidate.chain
      continue
    }

    const anchorNode = doc.getElementById(safeDecode(candidate.anchorId))
    if (!anchorNode) continue
    if (
      hasUsableNextPageNode &&
      isAnchorAtNextPageBoundary({
        anchorNode,
        nextPageNode,
      })
    ) {
      continue
    }

    const anchorRange = doc.createRange()
    anchorRange.setStartBefore(anchorNode)
    anchorRange.collapse(true)

    if (
      isRangeAtOrBeforeUpperBound({
        rangeToTest: anchorRange,
        upperBoundRange,
      }) &&
      (!bestAnchoredRange ||
        anchorRange.compareBoundaryPoints(
          Range.START_TO_START,
          bestAnchoredRange,
        ) > 0)
    ) {
      bestAnchoredChain = candidate.chain
      bestAnchoredRange = anchorRange
    }
  }

  const bestChain = bestAnchoredChain ?? bestFallbackChain

  return bestChain ? buildChapterInfoFromChain(bestChain) : undefined
}
