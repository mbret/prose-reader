import type { ResolvedMetadata } from "@prose-reader/archive-reader"
import type { MetadataIdentifier } from "../types/provider"
import { omitUndefined } from "../utils/omitUndefined"

const dedupeIdentifiers = (
  identifiers: ReadonlyArray<MetadataIdentifier>,
): ReadonlyArray<MetadataIdentifier> => {
  const seen = new Set<string>()

  return identifiers.filter((identifier) => {
    const key = `${identifier.scheme?.trim().toLowerCase() ?? ""}:${identifier.value.trim().toLowerCase()}`

    if (seen.has(key)) return false

    seen.add(key)

    return true
  })
}

/**
 * Merges several {@link ResolvedMetadata} into one, **first defined wins**:
 * the leftmost entry stating a field owns it. Precedence is entirely the
 * caller's — pass the sources in the order you trust them.
 *
 * ```ts
 * // the book over the catalogs, catalogs filling the gaps
 * const metadata = mergeResolvedMetadata(resolved.metadata, fetched.metadata)
 *
 * // the catalog over the book (a scene-released CBZ with a junk ComicInfo)
 * const metadata = mergeResolvedMetadata(fetched.metadata, resolved.metadata)
 * ```
 *
 * Field-wise rather than object-wise, so a source knowing only a cover
 * contributes its cover without hiding another's title. Two exceptions, both
 * because the values are additive rather than competing:
 *
 * - `identifiers` concatenate in argument order, deduped on scheme + value —
 *   different identifier systems coexist (this mirrors `resolveMetadata`).
 * - `belongsTo` merges its `series` and `collection` independently.
 *
 * Everything else — including `subjects`, `contributors` and the
 * format-scoped corners — takes the first stated value whole. Unioning
 * keyword lists across catalogs is a judgement call that belongs to the
 * consumer, not to a merge that must stay predictable.
 */
export const mergeResolvedMetadata = (
  ...entries: ReadonlyArray<ResolvedMetadata | undefined>
): ResolvedMetadata => {
  const defined = entries.filter(
    (entry): entry is ResolvedMetadata => entry !== undefined,
  )

  const first = <K extends keyof ResolvedMetadata>(
    key: K,
  ): ResolvedMetadata[K] => {
    for (const entry of defined) {
      const value = entry[key]

      if (value !== undefined) return value
    }

    return undefined
  }

  const identifiers = dedupeIdentifiers(
    defined.flatMap((entry) => entry.identifiers ?? []),
  )

  const belongsTo = omitUndefined({
    series: defined.find((entry) => entry.belongsTo?.series !== undefined)
      ?.belongsTo?.series,
    collection: defined.find(
      (entry) => entry.belongsTo?.collection !== undefined,
    )?.belongsTo?.collection,
  })

  // `Required` in the mapped type makes every key mandatory in this literal
  // (their values still accept `undefined`), so a field added to the
  // vocabulary is a compile error here until its merge rule is chosen —
  // silently dropping it would be the easy bug.
  const merged: {
    [K in keyof Required<ResolvedMetadata>]: ResolvedMetadata[K]
  } = {
    title: first("title"),
    cover: first("cover"),
    description: first("description"),
    publisher: first("publisher"),
    imprint: first("imprint"),
    rights: first("rights"),
    languages: first("languages"),
    subjects: first("subjects"),
    contributors: first("contributors"),
    published: first("published"),
    readingDirection: first("readingDirection"),
    renditionLayout: first("renditionLayout"),
    renditionFlow: first("renditionFlow"),
    renditionSpread: first("renditionSpread"),
    numberOfPages: first("numberOfPages"),
    gtin: first("gtin"),
    isbn: first("isbn"),
    identifiers: identifiers.length > 0 ? identifiers : undefined,
    belongsTo: Object.keys(belongsTo).length > 0 ? belongsTo : undefined,
    properties: first("properties"),
    comic: first("comic"),
    apple: first("apple"),
    kobo: first("kobo"),
  }

  return omitUndefined(merged)
}
