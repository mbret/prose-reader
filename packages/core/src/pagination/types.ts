/**
 * One edge of the visible range. The two edges are the same thing, so they
 * are the same type rather than two sets of `begin`/`end` prefixed fields.
 */
export type PaginationEdge = {
  cfi: string | undefined
  spineItemIndex: number | undefined
  pageIndexInSpineItem: number | undefined
  numberOfPagesInSpineItem: number
}

/**
 * An edge whose cfi describes the page actually visible, rather than standing
 * in with the start of its item.
 */
export type SettledPaginationEdge<TEdge extends PaginationEdge> = TEdge & {
  cfi: string
}

/**
 * `isSettled` tells a resolved result from a provisional one.
 *
 * A settled result describes the visible pages of the current layout over
 * content that is ready, which makes it the only one safe to persist as
 * reading progress. That is the whole difference between the two variants:
 * a settled result's edges have resolved positions, so their cfis are typed
 * as present, and establishing settlement is what gives a consumer access to
 * them. Page metrics stay on both, so navigation controls keep working on
 * estimates while a result is pending.
 *
 * It is generic over the edge so the enhancer's enriched edge discriminates
 * the same way, rather than restating the union one layer up.
 */
export type PaginationSettlement<TEdge extends PaginationEdge> =
  | {
      isSettled: false
      begin: TEdge
      end: TEdge
    }
  | {
      isSettled: true
      begin: SettledPaginationEdge<TEdge>
      end: SettledPaginationEdge<TEdge>
    }

export type PaginationInfo = {
  navigationId?: symbol
} & PaginationSettlement<PaginationEdge>
