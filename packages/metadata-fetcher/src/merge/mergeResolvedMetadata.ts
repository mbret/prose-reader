import type { ResolvedMetadata } from "@prose-reader/archive-reader"
import type { MetadataIdentifier } from "../types/provider.ts"
import { omitUndefined } from "../utils/omitUndefined.ts"

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
 * Merges several {@link ResolvedMetadata} into one, **first defined wins**.
 * Precedence is the caller's — pass the sources in the order you trust them.
 *
 * ```ts
 * // the book over the catalogs, catalogs filling the gaps
 * const metadata = mergeResolvedMetadata(resolved.metadata, fetched.metadata)
 * ```
 *
 * Field-wise rather than object-wise, so a source knowing only a cover
 * contributes it without hiding another's title. Two fields are additive
 * instead: `identifiers` concatenate (deduped on scheme + value, mirroring
 * `resolveMetadata`), and `belongsTo` merges `series` and `collection`
 * independently.
 *
 * Everything else takes the first stated value whole. Unioning keyword lists
 * across catalogs is a judgement call for the consumer, not for a merge that
 * has to stay predictable.
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

  // `Required` makes every key mandatory in this literal (values still accept
  // `undefined`), so a field added to the vocabulary is a compile error here
  // until its merge rule is chosen, rather than silently dropped.
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
