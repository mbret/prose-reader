import { isShallowEqual } from "@prose-reader/shared"
import type { PaginationEdge, PaginationSettlement } from "./types"

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
 * Carries a result's settlement onto edges rebuilt from it.
 *
 * Rebuilding an edge widens its cfi back to `string | undefined`, so the
 * settled variant has to be reconstructed under its own narrowing. That is
 * what keeps a settled result's positions typed as present once a layer has
 * enriched its edges.
 */
export const withSettlementOf = <TEdge extends PaginationEdge>(
  source: PaginationSettlement<PaginationEdge>,
  { begin, end }: { begin: TEdge; end: TEdge },
): PaginationSettlement<TEdge> =>
  source.isSettled
    ? {
        isSettled: true,
        begin: { ...begin, cfi: source.begin.cfi },
        end: { ...end, cfi: source.end.cfi },
      }
    : { isSettled: false, begin, end }
