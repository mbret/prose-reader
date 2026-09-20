import { isShallowEqual } from "@prose-reader/shared"
import type { PaginationEdge } from "./types"

export const createEmptyPaginationEdge = (): PaginationEdge => ({
  cfi: undefined,
  spineItemIndex: undefined,
  pageIndexInSpineItem: undefined,
  numberOfPagesInSpineItem: 0,
})

/**
 * Compares two results by value: each edge shallowly, then whatever else the
 * result carries shallowly.
 *
 * A result is rebuilt from scratch every time it is produced, so comparing one
 * shallowly as a whole would only ever see two brand new edge objects and call
 * two identical results different.
 */
export const isSamePaginationResult = <
  T extends { begin: object; end: object },
>(
  a: T,
  b: T,
) => {
  const { begin: beginA, end: endA, ...restA } = a
  const { begin: beginB, end: endB, ...restB } = b

  return (
    isShallowEqual(beginA, beginB) &&
    isShallowEqual(endA, endB) &&
    isShallowEqual(restA, restB)
  )
}
