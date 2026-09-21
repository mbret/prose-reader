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
 * Carries a result's settlement onto edges rebuilt from it.
 *
 * Rebuilding an edge widens its cfi back to `string | undefined`, so the
 * settled variant has to be reconstructed under its own narrowing. That is
 * what keeps a settled result's positions typed as present once a layer has
 * enriched its edges.
 */
export const withSettlementOf = <TEdge extends PaginationEdge>(
  source: VisibleRange<PaginationEdge>,
  { begin, end }: { begin: TEdge; end: TEdge },
): VisibleRange<TEdge> =>
  source.isSettled
    ? {
        isSettled: true,
        begin: { ...begin, cfi: source.begin.cfi },
        end: { ...end, cfi: source.end.cfi },
      }
    : { isSettled: false, begin, end }

/**
 * Drops the claim that a result's positions describe the page being read,
 * keeping its metrics so navigation controls stay responsive.
 *
 * This is the withdrawing counterpart to {@link withSettlementOf}, and the
 * controller is the only caller: it holds a result over time, so a trigger
 * has something to withdraw from. The enhancer has no use for it — it builds
 * each published result from an enrichment that never claimed settlement, so
 * there is nothing to take back.
 */
export const withoutSettlement = <TResult extends VisibleRange<PaginationEdge>>(
  result: TResult,
) => ({ ...result, isSettled: false as const })
