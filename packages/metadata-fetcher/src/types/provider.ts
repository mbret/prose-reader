import type { ResolvedMetadata } from "@prose-reader/archive-reader"

/** One entry of {@link ResolvedMetadata.identifiers}. */
export type MetadataIdentifier = NonNullable<
  ResolvedMetadata["identifiers"]
>[number]

/**
 * Per-search context handed to a provider alongside the metadata to look up.
 */
export type MetadataProviderContext = {
  /**
   * How many candidates the caller will keep. A hint for the provider's own
   * page size — the fetch enforces it as a hard cap after ranking anyway, so
   * returning more is allowed but wasteful.
   */
  readonly limit: number
  /** Cancellation signal to forward to every request the provider makes. */
  readonly signal?: AbortSignal
}

/**
 * One record a provider believes could be the book. A provider's whole job is
 * to search its catalog and normalize each hit into {@link ResolvedMetadata};
 * it does **not** score its own candidates — the fetch does that, identically
 * for everyone, so scores stay comparable.
 */
export type MetadataCandidate = {
  /** The record, normalized into the cross-format vocabulary. */
  readonly metadata: ResolvedMetadata
  /** Stable provider-native id, for pinning a user-confirmed match. */
  readonly id?: string
  /** Canonical url of the record, for attribution and deep links. */
  readonly url?: string
  /**
   * The provider's own record — provenance, and the escape hatch for fields
   * with no home in the vocabulary. Kept only when `includeRaw` is on.
   */
  readonly raw?: unknown
}

/**
 * A pluggable metadata source. Implementing one is: pick a stable `id`, read
 * the terms you can search on out of the metadata, return normalized
 * candidates.
 *
 * Both sides of a lookup speak {@link ResolvedMetadata} — what the book said
 * going in, what the catalog says coming back. There is no separate query
 * shape to learn: the vocabulary is already sparse by contract (`field !==
 * undefined` is a reliable presence check) and already carries everything a
 * catalog could key on, down to the format-scoped corners. `metadataAuthors`
 * is exported for the one derivation that needs the role vocabulary.
 *
 * ```ts
 * import { type MetadataProvider, metadataAuthors } from "@prose-reader/metadata-fetcher"
 *
 * const myProvider: MetadataProvider = {
 *   id: "myCatalog",
 *   name: "My Catalog",
 *   search: async (metadata, { limit, signal }) => {
 *     if (metadata.title === undefined) return []
 *
 *     const response = await fetch(
 *       `https://example.com/search?q=${encodeURIComponent(metadata.title)}` +
 *         `&author=${encodeURIComponent(metadataAuthors(metadata)[0] ?? "")}`,
 *       { signal },
 *     )
 *     const { results } = await response.json()
 *
 *     return results.slice(0, limit).map((result) => ({
 *       id: result.id,
 *       url: `https://example.com/book/${result.id}`,
 *       raw: result,
 *       metadata: { title: result.name, isbn: result.isbn },
 *     }))
 *   },
 * }
 * ```
 */
export type MetadataProvider = {
  /** Unique across the providers of one fetch: it keys the result's `sources`. */
  readonly id: string
  /** Human-readable name, for attribution in a UI. */
  readonly name: string
  /**
   * The candidates the catalog has, best-effort: an empty list when there is
   * nothing to search on, or nothing found. Throwing is allowed — a failing
   * provider never fails the fetch, it lands in `failedProviders`.
   */
  readonly search: (
    metadata: ResolvedMetadata,
    context: MetadataProviderContext,
  ) => Promise<ReadonlyArray<MetadataCandidate>>
}
