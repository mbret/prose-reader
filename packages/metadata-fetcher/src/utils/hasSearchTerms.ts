import type { FetchMetadataInput } from "../types/fetchMetadataInput.ts"

/**
 * Whether a catalog has anything to go on, so a lookup with nothing to ask
 * about costs no round trip. Publication details, a language, or a page count
 * narrow a search but cannot start one.
 */
export const hasSearchTerms = (input: FetchMetadataInput): boolean =>
  [input.title, input.isbn, input.gtin, input.googleBooksId, input.series].some(
    (value) => value !== undefined && value.trim().length > 0,
  ) ||
  (input.identifiers ?? []).some(
    (identifier) => identifier.value.trim().length > 0,
  ) ||
  (input.authors ?? []).some((author) => author.trim().length > 0)
