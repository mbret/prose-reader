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

const isScenarioBook = (value: string): value is ScenarioBook =>
  Object.keys(SCENARIO_BOOKS).includes(value)

/** The file of the book that the scenario's URL asks for with `?book=`. */
export const getFileOfRequestedScenarioBook = () => {
  const book = new URLSearchParams(window.location.search).get("book") ?? "ltr"

  if (!isScenarioBook(book)) {
    throw new Error(`this scenario has no ${book} book`)
  }

  return SCENARIO_BOOKS[book]
}
