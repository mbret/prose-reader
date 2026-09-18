import {
  type CrengineBoxedChild,
  type CrengineChild,
  getCrengineBoxedChildren,
  getFragmentBody,
  visitCrengineChildren,
} from "./crengine/children"
import { toRawOffset } from "./crengine/text"
import { parseXPointer } from "./parse"
import type { DomPosition, ParsedXPointer, XPointerStep } from "./types"

type Current =
  | { kind: "parent"; node: Element }
  | Extract<CrengineChild, { kind: "text" }>

/**
 * One step of `createXPointerV2` (crengine/src/lvtinydom.cpp): the N-th child
 * matching the step (first when the index is omitted), counted among the
 * children crengine kept. Element names compare case-insensitively.
 */
const findChild = (
  parent: Element,
  step: XPointerStep,
): CrengineChild | undefined => {
  const wantedIndex = step.index ?? 1
  const wantedName =
    step.kind === "element" ? step.name.toLowerCase() : undefined
  let count = 0
  let found: CrengineChild | undefined

  visitCrengineChildren(parent, (child) => {
    const matches =
      step.kind === "nodeIndex" ||
      (step.kind === "text"
        ? child.kind === "text"
        : child.kind === "element" &&
          child.node.localName.toLowerCase() === wantedName)

    if (!matches) return true

    count++

    if (count === wantedIndex) {
      found = child

      return false
    }

    return true
  })

  return found
}

const positionOfChild = (
  parent: Element,
  children: CrengineBoxedChild[],
  index: number,
): DomPosition => {
  const child = children[index]?.child

  if (!child) return { node: parent, offset: parent.childNodes.length }

  // The boundary before a later piece of a split text node lies inside it.
  if (child.kind === "text" && child.pieceIndex > 0) {
    return { node: child.node, offset: child.start }
  }

  return { node: parent, offset: child.childIndex }
}

/**
 * Resolves a pointer inside the spine item's document, following
 * `createXPointerV2` (crengine/src/lvtinydom.cpp). Returns `undefined` when
 * crengine would fail too: a step without a match, a point past the end of
 * the text or of the children (nothing is clamped), a V1 pointer naming a
 * boxing element.
 *
 * A text position is returned with a UTF-16 offset into the text node,
 * ready for `Range.setStart`; a text step without a point is its start. In
 * a spine item without a `<body>` (an SVG document) only the item itself
 * resolves, to its root element.
 */
export const resolveXPointer = (
  xpointer: string | ParsedXPointer,
  document: Document,
): DomPosition | undefined => {
  const parsed =
    typeof xpointer === "string" ? parseXPointer(xpointer) : xpointer

  if (!parsed || parsed.containsBoxingElements) return undefined

  const body = getFragmentBody(document)

  // An SVG spine item is one page to crengine: only the item itself is addressable.
  if (!body) {
    return parsed.steps.length === 0
      ? { node: document.documentElement }
      : undefined
  }

  let current: Current = { kind: "parent", node: body }

  for (const step of parsed.steps) {
    if (current.kind === "text") return undefined

    const child = findChild(current.node, step)

    if (!child) return undefined

    current =
      child.kind === "element" ? { kind: "parent", node: child.node } : child
  }

  if (current.kind === "text") {
    if (parsed.point === undefined) {
      return { node: current.node, offset: current.start }
    }

    const rawOffset = toRawOffset(
      current.node.data.slice(current.start, current.end),
      parsed.point,
      current.mode,
    )

    return rawOffset === undefined
      ? undefined
      : { node: current.node, offset: current.start + rawOffset }
  }

  const parent = current.node

  if (parsed.point === undefined) return { node: parent }

  const children = getCrengineBoxedChildren(parent)

  if (parsed.point > children.length) return undefined

  return positionOfChild(parent, children, parsed.point)
}
