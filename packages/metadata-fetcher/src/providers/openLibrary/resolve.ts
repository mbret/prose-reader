import type { ResolvedMetadata } from "@prose-reader/archive-reader"
import { omitUndefined } from "../../utils/omitUndefined.ts"
import { marcLanguageToBcp47 } from "./marcLanguage.ts"
import type { OpenLibraryDoc } from "./parse.ts"

/**
 * A popular work carries hundreds of subject headings on Open Library, most
 * of them long-tail noise ("Fiction, science fiction, general", "Accessible
 * book", "Protected DAISY"). Keeping them all would dwarf the entity a
 * consumer persists, so the head of the list — where the API puts the
 * meaningful ones — is kept and the tail is dropped.
 */
export const OPEN_LIBRARY_MAX_SUBJECTS = 25

/**
 * Where every {@link OpenLibraryDoc} field lands in {@link ResolvedMetadata}.
 * Compile-enforced against the parsed doc — adding a field to the parser
 * without declaring its home here is a type error. Same losslessness contract
 * as the archive parsers, and it doubles as the mapping documentation.
 */
export const openLibraryMetadataHomes = {
  key: "identifiers",
  title: "title",
  subtitle: "title",
  author_name: "contributors",
  first_publish_year: "published",
  publisher: "publisher",
  language: "languages",
  subject: "subjects",
  number_of_pages_median: "numberOfPages",
  cover_i: "cover",
} as const satisfies Record<
  keyof OpenLibraryDoc,
  keyof ResolvedMetadata | "identifiers"
>

/** The scheme announced for the Open Library work key in `identifiers`. */
export const OPEN_LIBRARY_IDENTIFIER_SCHEME = "OpenLibrary"

const emptyToUndefined = <T>(
  values: ReadonlyArray<T>,
): ReadonlyArray<T> | undefined => (values.length > 0 ? values : undefined)

/**
 * Normalizes one search hit into the cross-format vocabulary.
 *
 * Two choices worth stating:
 *
 * - **`title` folds in `subtitle`** (`"Dune: Messiah"`), because
 *   {@link ResolvedMetadata} has one title field and an OPF `dc:title`
 *   normally carries the subtitle too — comparing a bare title against a
 *   full one would cost match score.
 * - **`isbn` is only set when the search was an ISBN lookup**, and then it is
 *   the queried one: the API answered "this work has that ISBN", which is a
 *   fact about the record. A `search.json` hit describes a *work*, whose
 *   editions each have their own ISBN, so picking one out of a title search
 *   would be fabrication.
 */
export const resolveOpenLibraryDoc = (
  doc: OpenLibraryDoc,
  options: {
    /** Base url of the cover service, e.g. `https://covers.openlibrary.org`. */
    readonly coversBaseUrl: string
    /** The ISBN this record was looked up by, when it was. */
    readonly isbn?: string
  },
): ResolvedMetadata => {
  const title =
    doc.title !== undefined && doc.subtitle !== undefined
      ? `${doc.title}: ${doc.subtitle}`
      : doc.title

  const languages = emptyToUndefined([
    ...new Set(
      (doc.language ?? [])
        .map(marcLanguageToBcp47)
        .filter((language): language is string => language !== undefined),
    ),
  ])

  const identifiers = [
    ...(options.isbn !== undefined
      ? [{ value: options.isbn, scheme: "ISBN" }]
      : []),
    ...(doc.key !== undefined
      ? [{ value: doc.key, scheme: OPEN_LIBRARY_IDENTIFIER_SCHEME }]
      : []),
  ]

  return omitUndefined({
    title,
    cover:
      doc.cover_i !== undefined
        ? {
            // an absolute url, not a container-relative uri: a remote record
            // addresses its cover in the catalog's space, and there is
            // nothing to rebase it onto
            uri: `${options.coversBaseUrl}/b/id/${doc.cover_i}-L.jpg`,
            mediaType: "image/jpeg",
            confidence: "derived" as const,
          }
        : undefined,
    publisher: doc.publisher?.[0],
    languages,
    subjects: emptyToUndefined(
      (doc.subject ?? []).slice(0, OPEN_LIBRARY_MAX_SUBJECTS),
    ),
    contributors: emptyToUndefined(
      (doc.author_name ?? []).map((name) => ({
        name,
        roles: ["author" as const],
      })),
    ),
    published:
      doc.first_publish_year !== undefined
        ? { year: doc.first_publish_year }
        : undefined,
    numberOfPages: doc.number_of_pages_median,
    isbn: options.isbn,
    identifiers: emptyToUndefined(identifiers),
  })
}
