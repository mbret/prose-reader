import type { ResolvedMetadata } from "@prose-reader/archive-reader"
import type { MetadataQuery } from "../types/provider"
import { metadataAuthors } from "../utils/metadataAuthors"
import { omitUndefined } from "../utils/omitUndefined"

const trimToUndefined = (raw: string | undefined): string | undefined => {
  if (raw === undefined) return undefined

  const trimmed = raw.trim()

  return trimmed.length > 0 ? trimmed : undefined
}

const emptyToUndefined = <T>(
  values: ReadonlyArray<T>,
): ReadonlyArray<T> | undefined => (values.length > 0 ? values : undefined)

/**
 * Reduces what we know locally to the terms a catalog can search on — the
 * step between "a book container was resolved" and "ask the providers".
 * Exported because a provider test, or a consumer building a query from
 * something other than a resolved archive (a filename, a user's input form),
 * wants the same normalization:
 *
 * ```ts
 * const query = buildMetadataQuery({ title: "Dune", isbn: "0441013597" })
 * ```
 */
export const buildMetadataQuery = (
  metadata: ResolvedMetadata,
): MetadataQuery => {
  const published =
    metadata.published !== undefined &&
    Object.keys(metadata.published).length > 0
      ? metadata.published
      : undefined

  return omitUndefined({
    title: trimToUndefined(metadata.title),
    authors: emptyToUndefined(metadataAuthors(metadata)),
    isbn: trimToUndefined(metadata.isbn),
    gtin: trimToUndefined(metadata.gtin),
    identifiers: emptyToUndefined(metadata.identifiers ?? []),
    series: trimToUndefined(metadata.belongsTo?.series?.[0]?.name),
    publisher: trimToUndefined(metadata.publisher),
    languages: emptyToUndefined(metadata.languages ?? []),
    published,
    numberOfPages: metadata.numberOfPages,
    metadata,
  })
}
