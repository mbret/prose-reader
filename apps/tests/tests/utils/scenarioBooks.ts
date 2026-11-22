/**
 * One book in each direction of text, by name. `server/serveBooks.ts` makes the
 * rtl and vertical-rl books from the ltr one.
 */
export const TEXT_DIRECTION_BOOKS = {
  ltr: "accessible_epub_3.epub",
  rtl: "accessible_epub_3-rtl.epub",
  "vertical-rl": "accessible_epub_3-vertical-rl.epub",
} as const

export type TextDirectionBook = keyof typeof TEXT_DIRECTION_BOOKS

/**
 * The file of the book that the scenario's URL names with `?book=`, or of
 * `defaultBook` without one.
 */
export const getFileOfRequestedBook = <Book extends string>(
  booksByName: Record<Book, string>,
  defaultBook: NoInfer<Book>,
) => {
  const book = new URLSearchParams(window.location.search).get("book")
  const isNamedBook = (value: string): value is Book =>
    Object.keys(booksByName).includes(value)

  if (book === null) return booksByName[defaultBook]

  if (!isNamedBook(book)) {
    throw new Error(`this scenario has no ${book} book`)
  }

  return booksByName[book]
}
