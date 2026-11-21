import { getNextNodeInDocumentOrder } from "@prose-reader/core"

/**
 * The elements a highlight paints by their own box rather than line by line,
 * when the range selects them whole. An `svg` or a `math` that holds text is
 * one too: that text is part of a drawing, not of the lines around it.
 */
const ELEMENTS_PAINTED_BY_THEIR_BOX = new Set([
  "audio",
  "canvas",
  "embed",
  "iframe",
  "img",
  "math",
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

type ContentBox = { kind: "text" | "element"; box: HighlightBox }

type Span = { start: number; end: number }

type LineAxes = {
  across: (box: HighlightBox) => Span
  along: (box: HighlightBox) => Span
}

const HORIZONTAL_LINE_AXES: LineAxes = {
  across: ({ top, bottom }) => ({ start: top, end: bottom }),
  along: ({ left, right }) => ({ start: left, end: right }),
}

const VERTICAL_LINE_AXES: LineAxes = {
  across: ({ left, right }) => ({ start: left, end: right }),
  along: ({ top, bottom }) => ({ start: top, end: bottom }),
}

/** A `CDATASection` is a `Text` node too, and lays out its text the same. */
const isTextNode = (node: Node): node is Text =>
  node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE

const isElement = (node: Node): node is Element =>
  node.nodeType === Node.ELEMENT_NODE

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
  if (!isElement(node) || !ELEMENTS_PAINTED_BY_THEIR_BOX.has(node.localName))
    return undefined

  /**
   * The walk of `measureContentOfRange` reaches no element that holds the
   * start of `range`, so only its end can be inside `node`.
   */
  const isSelectedWhole = !node.contains(range.endContainer)

  return isSelectedWhole ? node : undefined
}

const toContentBoxes = (kind: ContentBox["kind"], rects: DOMRectList) =>
  Array.from(rects)
    .filter((rect) => rect.width > 0 && rect.height > 0)
    .map(
      ({ left, top, right, bottom }): ContentBox => ({
        kind,
        box: { left, top, right, bottom },
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
      contentBoxes.push(...toContentBoxes("text", textRange.getClientRects()))
    }

    const elementPaintedWhole = getElementPaintedWhole(node, range)

    if (elementPaintedWhole) {
      contentBoxes.push(
        ...toContentBoxes("element", elementPaintedWhole.getClientRects()),
      )
    }

    node = getNextNodeInDocumentOrder(node, {
      skipDescendants: !!elementPaintedWhole,
    })
  }

  return contentBoxes
}

const getLineAxesOfRange = ({ commonAncestorContainer }: Range) => {
  const element = isElement(commonAncestorContainer)
    ? commonAncestorContainer
    : commonAncestorContainer.parentElement

  if (!element) return HORIZONTAL_LINE_AXES

  const writingMode =
    element.ownerDocument.defaultView?.getComputedStyle(element).writingMode

  return writingMode?.startsWith("vertical")
    ? VERTICAL_LINE_AXES
    : HORIZONTAL_LINE_AXES
}

const getLengthOfSpan = ({ start, end }: Span) => end - start

/** Negative when the spans do not meet: minus the gap between them. */
const getOverlapOfSpans = (first: Span, second: Span) =>
  Math.min(first.end, second.end) - Math.max(first.start, second.start)

/**
 * Whether `textBox` continues the line of `previousTextBox`, the text box
 * before it in the document.
 *
 * Across the line, the two overlap by half the thicker one at least. A drop
 * cap, several lines thick, stays apart from the lines beside it.
 *
 * Along the line, a gap no wider than the thinner one is the padding or margin
 * of an inline element, which the box of the line covers. A wider gap is the
 * gap between two columns, where the text can go on at the same height. That
 * holds while the page margins keep the gap between columns wider than a line.
 */
const isContinuingLineOfText = (
  previousTextBox: HighlightBox,
  textBox: HighlightBox,
  lineAxes: LineAxes,
) => {
  const previousSpanAcross = lineAxes.across(previousTextBox)
  const spanAcross = lineAxes.across(textBox)
  const thicknesses = [
    getLengthOfSpan(previousSpanAcross),
    getLengthOfSpan(spanAcross),
  ]
  const isOnSameLine =
    getOverlapOfSpans(previousSpanAcross, spanAcross) >=
    Math.max(...thicknesses) / 2
  const isInSameColumn =
    getOverlapOfSpans(
      lineAxes.along(previousTextBox),
      lineAxes.along(textBox),
    ) >= -Math.min(...thicknesses)

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
 * The boxes a highlight of `range` paints, in the coordinates of its
 * document's own viewport, as `getClientRects()` measures them: one for each
 * line of the text it covers, from its first to its last character there, and
 * one for each element of `ELEMENTS_PAINTED_BY_THEIR_BOX` that it selects
 * whole. No two of them overlap, as long as the lines of the text do not.
 *
 * `Range.getClientRects()` cannot give them: it also gives the box of each
 * element that the range selects whole, such as a paragraph, with the blank
 * space beside its lines
 * (https://drafts.csswg.org/cssom-view/#dom-range-getclientrects).
 */
export const getHighlightBoxesOfRange = (range: Range) => {
  const lineAxes = getLineAxesOfRange(range)
  const contentBoxes = measureContentOfRange(range)
  const highlightBoxes: HighlightBox[] = []

  for (const [index, contentBox] of contentBoxes.entries()) {
    const previousContentBox = contentBoxes[index - 1]
    const lastHighlightBox = highlightBoxes.at(-1)
    const isJoiningLineOfText =
      contentBox.kind === "text" &&
      previousContentBox?.kind === "text" &&
      isContinuingLineOfText(previousContentBox.box, contentBox.box, lineAxes)

    if (lastHighlightBox && isJoiningLineOfText) {
      highlightBoxes[highlightBoxes.length - 1] = getBoxAroundBoth(
        lastHighlightBox,
        contentBox.box,
      )
    } else {
      highlightBoxes.push(contentBox.box)
    }
  }

  return highlightBoxes
}
