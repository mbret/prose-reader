import type { ResolvedArchive } from "@prose-reader/archive-reader"
import {
  type FetchMetadataInput,
  GOOGLE_BOOKS_IDENTIFIER_SCHEME,
} from "./types/fetchMetadataInput.ts"
import { metadataAuthors } from "./utils/metadataAuthors.ts"
import { omitUndefined } from "./utils/omitUndefined.ts"

/**
 * Projects archive-reader's rich metadata entity into the fields understood by
 * metadata lookup and matching. Edition publication details take precedence
 * because embedded publication metadata normally describes that concrete
 * edition; original-publication details are the fallback.
 */
export const metadataInputFromResolvedArchive = (
  resolved: Pick<ResolvedArchive, "metadata">,
): FetchMetadataInput => {
  const { metadata } = resolved
  const authors = metadataAuthors(metadata)
  const googleBooksIdentifier = metadata.identifiers?.find(
    ({ scheme }) =>
      scheme?.trim().toLowerCase() ===
      GOOGLE_BOOKS_IDENTIFIER_SCHEME.toLowerCase(),
  )
  const identifiers = metadata.identifiers
    ?.filter((identifier) => identifier !== googleBooksIdentifier)
    .map(({ value, scheme }) => omitUndefined({ value, scheme }))

  return omitUndefined({
    title: metadata.title,
    authors: authors.length > 0 ? authors : undefined,
    isbn: metadata.isbn,
    gtin: metadata.gtin,
    googleBooksId: googleBooksIdentifier?.value,
    identifiers:
      identifiers !== undefined && identifiers.length > 0
        ? identifiers
        : undefined,
    series: metadata.belongsTo?.series?.[0]?.name,
    publisher:
      metadata.publication?.edition?.publisher ??
      metadata.publication?.original?.publisher,
    publishedYear:
      metadata.publication?.edition?.date?.year ??
      metadata.publication?.original?.date?.year,
    languages: metadata.languages,
    numberOfPages: metadata.numberOfPages,
  })
}
