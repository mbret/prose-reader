import {
  generate,
  getEpubCfiSpineItemref,
  isIndirectionOnly,
  parse,
  resolve,
} from "@prose-reader/cfi"
import { isTextNode } from "./crengine/children"
import { isElement } from "./crengine/elements"
import { generateXPointer } from "./generate"
import { parseXPointer } from "./parse"
import { resolveXPointer } from "./resolve"
import { serializeXPointer } from "./serialize"
import type { DomPosition, ParsedXPointer } from "./types"

export type XPointerSpineItem = {
  /** The spine item's content document, parsed as XHTML (what prose renders in its frames). */
  document: Document
  /** The `<itemref>` idref, written as the CFI's id assertion (`/6/14[chap05]!`) when given. */
  id?: string
}

/**
 * Hands out the document of a spine item by its 0-based index. A pointer
 * names its own spine item (`DocFragment[N]`) and is resolved in that
 * document, never in whichever one happens to be on screen: Readest shipped
 * that bug (readest/readest#5980) and landed a chapter away.
 */
export type XPointerSpineItemLookup = (
  spineItemIndex: number,
) => XPointerSpineItem | undefined

/**
 * The position a CFI can point to for a DOM position. A CFI cannot point
 * between an element's children, so a child index point becomes the start of
 * that child, and the end of the children the end of the last text child or
 * the element itself. Any other position is returned as it is.
 */
export const toCfiPosition = (position: DomPosition): DomPosition => {
  const { node, offset } = position

  if (!isElement(node) || offset === undefined) return position

  const child = node.childNodes[offset]

  if (child) {
    return isTextNode(child) ? { node: child, offset: 0 } : { node: child }
  }

  const last = node.lastChild

  return last && isTextNode(last)
    ? { node: last, offset: last.data.length }
    : { node }
}

/**
 * The CFI of a KOReader position, built with `@prose-reader/cfi` in the
 * spine item document the pointer names. `undefined` when the pointer is
 * malformed, its spine item is not available or it does not resolve; the
 * spine index alone is still available through `parseXPointer`.
 */
export const xPointerToCfi = (
  xpointer: string | ParsedXPointer,
  getSpineItem: XPointerSpineItemLookup,
): string | undefined => {
  try {
    const parsed =
      typeof xpointer === "string" ? parseXPointer(xpointer) : xpointer

    if (!parsed) return undefined

    const spineItem = getSpineItem(parsed.spineItemIndex)

    if (!spineItem) return undefined

    const position = resolveXPointer(parsed, spineItem.document)

    if (!position) return undefined

    const { node, offset } = toCfiPosition(position)

    return generate({
      node,
      offset: isTextNode(node) ? offset : undefined,
      spineIndex: parsed.spineItemIndex,
      spineId: spineItem.id,
    })
  } catch {
    return undefined
  }
}

const firstOffset = (offset: number | number[] | undefined) =>
  Array.isArray(offset) ? offset[0] : offset

/**
 * The KOReader pointer of a prose CFI: the CFI's start when it is a range,
 * the start of the spine item for a root CFI (`epubcfi(/6/14[chap05]!)`).
 * `undefined` when the CFI is malformed, its spine item is not available or
 * it does not resolve in that document.
 */
export const cfiToXPointer = (
  cfi: string,
  getSpineItem: XPointerSpineItemLookup,
): string | undefined => {
  try {
    const itemref = getEpubCfiSpineItemref(cfi)

    if (!itemref) return undefined

    const { spineIndex } = itemref

    if (!Number.isInteger(spineIndex) || spineIndex < 0) return undefined

    const parsed = parse(cfi)

    if (isIndirectionOnly(parsed)) {
      return serializeXPointer({
        spineItemIndex: spineIndex,
        steps: [],
        point: undefined,
        containsBoxingElements: false,
      })
    }

    const spineItem = getSpineItem(spineIndex)

    if (!spineItem) return undefined

    const resolved = resolve(parsed, spineItem.document)

    if (!resolved.node) return undefined

    const position: DomPosition = resolved.isRange
      ? {
          node: resolved.node.startContainer,
          offset: resolved.node.startOffset,
        }
      : {
          node: resolved.node,
          offset: isTextNode(resolved.node)
            ? (firstOffset(resolved.offset) ?? 0)
            : undefined,
        }

    return generateXPointer(position, spineIndex)
  } catch {
    return undefined
  }
}
