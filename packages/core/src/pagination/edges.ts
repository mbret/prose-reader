import { isShallowEqual } from "@prose-reader/shared"
import type { PaginationEdge, VisibleRange } from "./types"

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

/**
 * Drops the claim that a result's positions describe the page being read,
 * keeping its metrics so navigation controls stay responsive.
 */
export const withoutSettlement = <TResult extends VisibleRange<PaginationEdge>>(
  result: TResult,
) => ({ ...result, isSettled: false as const })
