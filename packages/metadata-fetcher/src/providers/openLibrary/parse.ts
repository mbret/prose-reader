import {
  isJsonRecord,
  readNumber,
  readRecordArray,
  readString,
  readStringArray,
} from "../../utils/json.ts"

/**
 * One entry of an Open Library `search.json` response, field names mirroring
 * the API (same rule as the archive parsers: a parsed source looks like its
 * source document). Every field is optional — the API omits what it doesn't
 * have, and the `fields` parameter decides what it may return at all.
 *
 * @see https://openlibrary.org/dev/docs/api/search
 */
export type OpenLibraryDoc = {
  /** Work key, e.g. `/works/OL45883W`. */
  readonly key?: string
  readonly title?: string
  readonly subtitle?: string
  readonly author_name?: ReadonlyArray<string>
  readonly first_publish_year?: number
  readonly publisher?: ReadonlyArray<string>
  /** MARC 21 language codes (`eng`, `fre`), not BCP 47. */
  readonly language?: ReadonlyArray<string>
  readonly subject?: ReadonlyArray<string>
  readonly number_of_pages_median?: number
  /** Cover id, addressing `covers.openlibrary.org`. */
  readonly cover_i?: number
  /** Project Gutenberg ebook ids attached to the work's editions. */
  readonly id_project_gutenberg?: ReadonlyArray<string>
}

const parseDoc = (record: Record<string, unknown>): OpenLibraryDoc => ({
  key: readString(record, "key"),
  title: readString(record, "title"),
  subtitle: readString(record, "subtitle"),
  author_name: readStringArray(record, "author_name"),
  first_publish_year: readNumber(record, "first_publish_year"),
  publisher: readStringArray(record, "publisher"),
  language: readStringArray(record, "language"),
  subject: readStringArray(record, "subject"),
  number_of_pages_median: readNumber(record, "number_of_pages_median"),
  cover_i: readNumber(record, "cover_i"),
  id_project_gutenberg: readStringArray(record, "id_project_gutenberg"),
})

/**
 * Reads the `docs` of a `search.json` payload. A payload that isn't a record,
 * or carries no `docs` array, yields an empty list: an unexpected response
 * shape is "this catalog has nothing for us", not a crash.
 */
export const parseOpenLibrarySearchResponse = (
  payload: unknown,
): ReadonlyArray<OpenLibraryDoc> => {
  if (!isJsonRecord(payload)) return []

  return readRecordArray(payload, "docs").map(parseDoc)
}
