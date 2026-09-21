import {
  type CrengineChild,
  getCrengineBoxedChildren,
  getFragmentBody,
  isTextNode,
  visitCrengineChildren,
} from "./crengine/children"
import {
  crengineElementName,
  getParentContext,
  hasImproperTableChildren,
  isElement,
} from "./crengine/elements"
import { toCrengineOffset } from "./crengine/text"
import { serializeXPointer } from "./serialize"
import type { DomPosition, XPointerStep } from "./types"

const DOCUMENT_NODE = 9

const isDocument = (node: Node): node is Document =>
  node.nodeType === DOCUMENT_NODE

/**
 * Position of `node` among the same-name element children of `parent`, as
 * `toStringV2` (crengine/src/lvtinydom.cpp) writes it: the index is emitted
 * only when the parent holds more than one element of that name.
 */
const elementStep = (
  parent: Element,
  node: Element,
  insideSvg: boolean,
): XPointerStep | undefined => {
  const name = crengineElementName(node, insideSvg)
  let index: number | undefined
  let count = 0

  visitCrengineChildren(parent, (child) => {
    if (
      child.kind !== "element" ||
      crengineElementName(child.node, insideSvg) !== name
    )
      return true

    count++

    if (child.node === node) index = count

    // Once the node is found, one more same-name sibling settles the shape.
    return index === undefined || count === 1
  })

  if (index === undefined) return undefined

  return { kind: "element", name, index: count > 1 ? index : undefined }
}

/**
 * Steps from the fragment body down to `element` (excluded when it is the
 * body). `undefined` when the element does not hang under the body crengine
 * knows (detached, or in `<head>`).
 */
const stepsTo = (
  element: Element,
  body: Element,
): XPointerStep[] | undefined => {
  const chain: Element[] = []
  let node: Node | null = element

  while (node !== body) {
    if (!node || !isElement(node)) return undefined

    chain.push(node)
    node = node.parentNode
  }

  chain.reverse()

  const steps: XPointerStep[] = []
  let parent: Element = body
  let insideSvg = false

  for (const current of chain) {
    const step = elementStep(parent, current, insideSvg)

    if (!step) return undefined

    steps.push(step)

    if (current.localName.toLowerCase() === "svg") insideSvg = true

    parent = current
  }

  return steps
}

/** The kept piece of `text` holding UTF-16 `offset`, its 1-based rank among the parent's text pieces and whether it has siblings. */
const findTextPiece = (parent: Element, text: Text, offset: number) => {
  let found: Extract<CrengineChild, { kind: "text" }> | undefined
  let foundIndex = 0
  let count = 0

  visitCrengineChildren(parent, (child) => {
    if (child.kind !== "text") return true

    count++

    if (found === undefined && child.node === text) {
      const last = child.pieceIndex === child.pieceCount - 1

      if (offset < child.end || last) {
        found = child
        foundIndex = count
      }
    }

    // Once the piece is found, one more text sibling settles the shape.
    return found === undefined || count === 1
  })

  if (!found) return undefined

  return { piece: found, index: foundIndex, count }
}

/**
 * crengine's child index for the boundary before browser child `offset`:
 * every child crengine's element holds (an `autoBoxing` wrapper counting
 * once, each piece of a split text node counting) that starts before it. A
 * boundary inside a wrapper becomes the wrapper's start. `undefined` where
 * crengine rebuilds the children with wrappers of its own (ruby, MathML)
 * and a non-zero index cannot be known.
 */
const childIndexBefore = (parent: Element, offset: number) => {
  const context = getParentContext(parent)
  let index = 0

  for (const { child, lastChildIndex } of getCrengineBoxedChildren(
    parent,
    context,
  )) {
    if (child.childIndex >= offset || offset <= lastChildIndex) break

    index++
  }

  const unknowable = context.restructured || hasImproperTableChildren(parent)

  return unknowable && index > 0 ? undefined : index
}

/**
 * The classic V2 pointer for a DOM position, as `toStringV2`
 * (crengine/src/lvtinydom.cpp) writes it for a book opened with a DOM
 * version between 20200223 and 20260811: `[N]` only where the name is shared
 * by more than one sibling, `text()` without `[N]` when the parent holds a
 * single text node. The result resolves in crengine to the same node.
 *
 * `undefined` for positions crengine has no node for: a whitespace-only text
 * node it dropped, text under an element that takes no text, an element
 * outside the `<body>`, an offset past the end of a text node, anything
 * inside an SVG spine item but the item itself.
 */
export const generateXPointer = (
  position: DomPosition,
  spineItemIndex: number,
): string | undefined => {
  if (!Number.isInteger(spineItemIndex) || spineItemIndex < 0) return undefined

  const { node, offset } = position
  const document = isDocument(node) ? node : node.ownerDocument

  if (!document) return undefined

  const body = getFragmentBody(document)
  const build = (
    steps: XPointerStep[] | undefined,
    point: number | undefined,
  ) =>
    steps === undefined
      ? undefined
      : serializeXPointer({
          spineItemIndex,
          steps,
          point,
          containsBoxingElements: false,
        })

  // An SVG spine item is one page to crengine: only the item itself is addressable.
  if (!body) {
    return isDocument(node) || node === document.documentElement
      ? build([], undefined)
      : undefined
  }

  if (isDocument(node)) return undefined

  if (isTextNode(node)) {
    const parent = node.parentNode
    const rawOffset = offset ?? 0

    if (
      !parent ||
      !isElement(parent) ||
      rawOffset < 0 ||
      rawOffset > node.data.length
    )
      return undefined

    const text = findTextPiece(parent, node, rawOffset)

    if (!text) return undefined

    const { piece } = text
    const steps = stepsTo(parent, body)

    if (!steps) return undefined

    steps.push({ kind: "text", index: text.count > 1 ? text.index : undefined })

    return build(
      steps,
      toCrengineOffset(
        node.data.slice(piece.start, piece.end),
        rawOffset - piece.start,
        piece.mode,
      ),
    )
  }

  if (!isElement(node)) return undefined

  if (offset === undefined) return build(stepsTo(node, body), undefined)

  if (offset < 0 || offset > node.childNodes.length) return undefined

  const point = childIndexBefore(node, offset)

  return point === undefined ? undefined : build(stepsTo(node, body), point)
}
