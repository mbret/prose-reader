export type PaginationInfo = {
  /** True only after navigation and page position generation have settled. */
  isSettled: boolean
  beginPageIndexInSpineItem: number | undefined
  beginNumberOfPagesInSpineItem: number
  beginCfi: string | undefined
  beginSpineItemIndex: number | undefined
  endPageIndexInSpineItem: number | undefined
  endNumberOfPagesInSpineItem: number
  endCfi: string | undefined
  endSpineItemIndex: number | undefined
  navigationId?: symbol
}
