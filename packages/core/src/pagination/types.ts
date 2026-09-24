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
 * The two edges of what is visible, and whether their positions have been
 * resolved. `isSettled` is what tells those two states apart.
 *
 * A settled range describes the visible pages of the current layout over
 * content that is ready. That is the whole difference between the two
 * variants: a settled range's edges have resolved positions, so their cfis
 * are typed as present, and establishing settlement is what gives a consumer
 * access to them. It describes how the current layout cuts the pages, so it
 * moves when the book is laid out again; to save progress, use the
 * navigator's `readingPosition$`, which does not. Page metrics stay on both,
 * so navigation controls keep working on estimates while a range is pending.
 *
 * It is generic over the edge so the enhancer's enriched edge discriminates
 * the same way, rather than restating the union one layer up.
 */
export type VisibleRange<TEdge extends PaginationEdge> =
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

export type PaginationInfo = VisibleRange<PaginationEdge>
