import type {
  ResolvedMetadata,
  ResolvedMetadataHome,
} from "@prose-reader/archive-reader"
import { omitUndefined } from "../../utils/omitUndefined.ts"
import { marcLanguageToBcp47 } from "./marcLanguage.ts"
import type { OpenLibraryDoc } from "./parse.ts"

/**
 * A popular work carries hundreds of subject headings, most of them long-tail
 * noise ("Accessible book", "Protected DAISY"), which would dwarf the entity a
 * consumer persists. The API puts the meaningful ones first.
 */
export const OPEN_LIBRARY_MAX_SUBJECTS = 25

/**
 * Where every {@link OpenLibraryDoc} field lands in {@link ResolvedMetadata},
 * compile-enforced: adding a field to the parser without declaring its home is
 * a type error. The archive parsers' losslessness contract, and the mapping
 * documentation.
 */
export const openLibraryMetadataHomes = {
  key: "identifiers",
  title: "title",
  subtitle: "title",
  author_name: "contributors",
  first_publish_year: "publication.original.date",
  language: "languages",
  subject: "subjects",
  number_of_pages_median: "numberOfPages",
  cover_i: "cover",
  id_project_gutenberg: "identifiers",
} as const satisfies Record<
  keyof OpenLibraryDoc,
  ResolvedMetadataHome | "identifiers"
>

export const OPEN_LIBRARY_IDENTIFIER_SCHEME = "OpenLibrary"
const PROJECT_GUTENBERG_IDENTIFIER_SCHEME = "ProjectGutenberg"

const emptyToUndefined = <T>(
  values: ReadonlyArray<T>,
): ReadonlyArray<T> | undefined => (values.length > 0 ? values : undefined)

/**
 * Normalizes one search hit into the cross-format vocabulary. Two choices
 * worth stating:
 *
 * - **`title` folds in `subtitle`** (`Dune: Messiah`): the vocabulary has one
 *   title field, and an OPF `dc:title` normally carries the subtitle too, so
 *   comparing a bare title against a full one would cost match score.
 * - **`isbn` is set only for an ISBN lookup**, to the queried one — the API
 *   answered "this work has that ISBN", a fact about the record. A hit
 *   describes a *work*, whose editions each have their own ISBN, so picking
 *   one out of a title search would be fabrication.
 */
export const resolveOpenLibraryDoc = (
  doc: OpenLibraryDoc,
  options: {
    readonly coversBaseUrl: string
    /** The ISBN this record was looked up by, when it was. */
    readonly isbn?: string
    /** The source identifier that an exact Gutenberg-id lookup confirmed. */
    readonly matchedProjectGutenbergIdentifier?: {
      readonly value: string
      readonly scheme?: string
    }
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
    ...(options.matchedProjectGutenbergIdentifier !== undefined
      ? [options.matchedProjectGutenbergIdentifier]
      : []),
    ...(doc.id_project_gutenberg ?? []).map((value) => ({
      value,
      scheme: PROJECT_GUTENBERG_IDENTIFIER_SCHEME,
    })),
    ...(doc.key !== undefined
      ? [{ value: doc.key, scheme: OPEN_LIBRARY_IDENTIFIER_SCHEME }]
      : []),
  ]

  return omitUndefined({
    title,
    cover:
      doc.cover_i !== undefined
        ? {
            // absolute, not container-relative: a catalog addresses its
            // covers in its own space, with nothing to rebase onto
            uri: `${options.coversBaseUrl}/b/id/${doc.cover_i}-L.jpg`,
            mediaType: "image/jpeg",
            confidence: "derived" as const,
          }
        : undefined,
    publication:
      doc.first_publish_year !== undefined
        ? { original: { date: { year: doc.first_publish_year } } }
        : undefined,
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
    numberOfPages: doc.number_of_pages_median,
    isbn: options.isbn,
    identifiers: emptyToUndefined(identifiers),
  })
}
