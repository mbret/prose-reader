/**
 * One book in each direction of text, by name. `server/serveBooks.ts` makes the
 * rtl and vertical-rl books from the ltr one.
 */
export const SCENARIO_BOOKS = {
  ltr: "accessible_epub_3.epub",
  rtl: "accessible_epub_3-rtl.epub",
  "vertical-rl": "accessible_epub_3-vertical-rl.epub",
} as const

export type ScenarioBook = keyof typeof SCENARIO_BOOKS

/**
 * The file of the book that the scenario's URL asks for with `?book=`, among
 * the books the scenario opens by name. Without `?book=`, `defaultBook`.
 */
export const getFileOfRequestedBook = <Book extends string>(
  booksOfScenario: Record<Book, string>,
  defaultBook: Book,
) => {
  const book = new URLSearchParams(window.location.search).get("book")
  const isBookOfScenario = (value: string): value is Book =>
    Object.keys(booksOfScenario).includes(value)

  if (book === null) return booksOfScenario[defaultBook]

  if (!isBookOfScenario(book)) {
    throw new Error(`this scenario has no ${book} book`)
  }

  return booksOfScenario[book]
}

/** The file of the book of `SCENARIO_BOOKS` that the scenario's URL asks for. */
export const getFileOfRequestedScenarioBook = () =>
  getFileOfRequestedBook<ScenarioBook>(SCENARIO_BOOKS, "ltr")
