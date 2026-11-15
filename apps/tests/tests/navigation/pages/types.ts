/** The books of this scenario, by the way their pages progress. */
export const BOOK_DIRECTIONS = {
  ltr: "accessible_epub_3.epub",
  rtl: "accessible_epub_3-rtl.epub",
  "vertical-rl": "accessible_epub_3-vertical-rl.epub",
} as const

export type BookDirection = keyof typeof BOOK_DIRECTIONS

export const isBookDirection = (value: string): value is BookDirection =>
  Object.keys(BOOK_DIRECTIONS).includes(value)

/** What a `beforeTapGesture` hook gets about the page of a tap. */
export type TappedPage = {
  spineItemIndex: number
  pageIndex: number
  positionInPage: { x: number; y: number }
  pageSize: { width: number; height: number }
}
