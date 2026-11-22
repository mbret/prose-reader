import { TEXT_DIRECTION_BOOKS } from "../../utils/scenarioBooks"

/** `server/serveBooks.ts` makes the pre-paginated book. */
export const SCRUBBER_BOOKS = {
  "pre-paginated-rtl": "haruko-html-jpeg-pre-paginated-blank-pages.epub",
  "reflowable-with-chapters": TEXT_DIRECTION_BOOKS.ltr,
} as const

export type ScrubberBook = keyof typeof SCRUBBER_BOOKS
