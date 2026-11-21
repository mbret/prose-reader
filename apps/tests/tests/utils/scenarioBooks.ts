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

export const isScenarioBook = (value: string): value is ScenarioBook =>
  Object.keys(SCENARIO_BOOKS).includes(value)
