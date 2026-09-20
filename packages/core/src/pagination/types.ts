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

export type PaginationInfo = {
  begin: PaginationEdge
  end: PaginationEdge
  navigationId?: symbol
}
