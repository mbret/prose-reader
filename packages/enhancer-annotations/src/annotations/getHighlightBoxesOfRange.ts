import { getNextNodeInDocumentOrder, isHtmlElement } from "@prose-reader/core"

/**
 * The elements a highlight paints by their own box: what they show is not
 * text, so it has no line to paint.
 */
const ELEMENTS_PAINTED_BY_THEIR_BOX = new Set([
  "audio",
  "canvas",
  "embed",
  "iframe",
  "img",
  "object",
  "svg",
  "video",
])

type HighlightBox = {
  left: number
  top: number
  right: number
  bottom: number
}

type ContentBox = { box: HighlightBox; isText: boolean }

type Span = { start: number; end: number }

/** A `CDATASection` is a `Text` node too, and lays out its text the same. */
const isTextNode = (node: Node): node is Text =>
  node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE

const getFirstNodeOfRange = ({ startContainer, startOffset }: Range) =>
  isTextNode(startContainer)
    ? startContainer
    : (startContainer.childNodes.item(startOffset) ??
      getNextNodeInDocumentOrder(startContainer, { skipDescendants: true }))

/** `null` when the range runs to the end of its document. */
const getFirstNodeAfterRange = ({ endContainer, endOffset }: Range) =>
  endContainer.childNodes.item(endOffset) ??
  getNextNodeInDocumentOrder(endContainer, { skipDescendants: true })

/** `node`, when the highlight of `range` paints it whole by its box. */
const getElementPaintedWhole = (node: Node, range: Range) => {
  if (
    !isHtmlElement(node) ||
    !ELEMENTS_PAINTED_BY_THEIR_BOX.has(node.localName)
  )
    return undefined

  /**
   * The walk starts after the start of the range, so only its end can be
   * inside an element that the walk reaches.
   */
  const isSelectedWhole = !node.contains(range.endContainer)

  return isSelectedWhole ? node : undefined
}

const toContentBoxes = (rects: DOMRectList, isText: boolean) =>
  Array.from(rects)
    .filter((rect) => rect.width > 0 && rect.height > 0)
    .map(
      ({ left, top, right, bottom }): ContentBox => ({
        box: { left, top, right, bottom },
        isText,
      }),
    )

/**
 * The boxes of the content of `range`, in document order: those of the text
 * it covers, measured one text node at a time, and those of the elements it
 * paints whole.
 */
const measureContentOfRange = (range: Range) => {
  const contentBoxes: ContentBox[] = []
  const textRange = range.cloneRange()
  const firstNodeAfterRange = getFirstNodeAfterRange(range)
  let node: Node | null = getFirstNodeOfRange(range)

  while (node && node !== firstNodeAfterRange) {
    if (isTextNode(node)) {
      textRange.setStart(
        node,
        node === range.startContainer ? range.startOffset : 0,
      )
      textRange.setEnd(
        node,
        node === range.endContainer ? range.endOffset : node.length,
      )
      contentBoxes.push(...toContentBoxes(textRange.getClientRects(), true))
    }

    const elementPaintedWhole = getElementPaintedWhole(node, range)

    if (elementPaintedWhole) {
      contentBoxes.push(
        ...toContentBoxes(elementPaintedWhole.getClientRects(), false),
      )
    }

    node = getNextNodeInDocumentOrder(node, {
      skipDescendants: !!elementPaintedWhole,
    })
  }

  return contentBoxes
}

/**
 * Whether the lines of `range` run down, as in a vertical writing mode,
 * rather than across.
 */
const isRangeInVerticalLines = ({ commonAncestorContainer }: Range) => {
  const element = isHtmlElement(commonAncestorContainer)
    ? commonAncestorContainer
    : commonAncestorContainer.parentElement

  if (!element) return false

  const writingMode =
    element.ownerDocument.defaultView?.getComputedStyle(element).writingMode ??
    ""

  return (
    writingMode.startsWith("vertical") || writingMode.startsWith("sideways")
  )
}

const getSpanAcrossLine = (box: HighlightBox, isLineVertical: boolean) =>
  isLineVertical
    ? { start: box.left, end: box.right }
    : { start: box.top, end: box.bottom }

const getSpanAlongLine = (box: HighlightBox, isLineVertical: boolean) =>
  isLineVertical
    ? { start: box.top, end: box.bottom }
    : { start: box.left, end: box.right }

/** Negative when the spans do not meet: minus the gap between them. */
const getOverlapOfSpans = (first: Span, second: Span) =>
  Math.min(first.end, second.end) - Math.max(first.start, second.start)

/**
 * Whether `textBox` continues the line of text that `lineBox` paints. The
 * next line never overlaps it by half its thickness. Along the line, a gap
 * no wider than the line is thick is the padding or margin of an inline
 * element, which the box of the line covers. A wider gap separates two
 * columns, whose lines can be at the same height.
 */
const isContinuingLineOfText = (
  lineBox: HighlightBox,
  textBox: HighlightBox,
  isLineVertical: boolean,
) => {
  const lineSpanAcross = getSpanAcrossLine(lineBox, isLineVertical)
  const textSpanAcross = getSpanAcrossLine(textBox, isLineVertical)
  const thicknessOfLine = Math.min(
    lineSpanAcross.end - lineSpanAcross.start,
    textSpanAcross.end - textSpanAcross.start,
  )
  const isOnSameLine =
    getOverlapOfSpans(lineSpanAcross, textSpanAcross) >= thicknessOfLine / 2
  const isInSameColumn =
    getOverlapOfSpans(
      getSpanAlongLine(lineBox, isLineVertical),
      getSpanAlongLine(textBox, isLineVertical),
    ) >= -thicknessOfLine

  return isOnSameLine && isInSameColumn
}

const getBoxAroundBoth = (
  first: HighlightBox,
  second: HighlightBox,
): HighlightBox => ({
  left: Math.min(first.left, second.left),
  top: Math.min(first.top, second.top),
  right: Math.max(first.right, second.right),
  bottom: Math.max(first.bottom, second.bottom),
})

/**
 * The boxes a highlight of `range` paints, in the coordinates of the range's
 * document: one for each line of the text it covers, from its first to its
 * last character there, and one for each image, or other element that shows
 * no text, that it selects whole. No two of them overlap, as long as the
 * lines of the text do not.
 *
 * `Range.getClientRects()` cannot give them: it also gives the box of each
 * element that the range selects whole, such as a paragraph, with the blank
 * space beside its lines
 * (https://drafts.csswg.org/cssom-view/#dom-range-getclientrects).
 */
export const getHighlightBoxesOfRange = (range: Range) => {
  const isLineVertical = isRangeInVerticalLines(range)
  const highlightBoxes: ContentBox[] = []

  for (const contentBox of measureContentOfRange(range)) {
    const lastHighlightBox = highlightBoxes.at(-1)
    const isJoiningLastLine =
      !!lastHighlightBox?.isText &&
      contentBox.isText &&
      isContinuingLineOfText(
        lastHighlightBox.box,
        contentBox.box,
        isLineVertical,
      )

    if (lastHighlightBox && isJoiningLastLine) {
      lastHighlightBox.box = getBoxAroundBoth(
        lastHighlightBox.box,
        contentBox.box,
      )
    } else {
      highlightBoxes.push({ ...contentBox })
    }
  }

  return highlightBoxes.map(({ box }) => box)
}
