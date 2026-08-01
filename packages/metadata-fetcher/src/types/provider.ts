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
 * One record a provider believes could be the book. The provider's whole job:
 * search its catalog and normalize each hit into the shared
 * {@link ResolvedMetadata} vocabulary. It does **not** score its own
 * candidates — how well a record matches the query is computed by the fetch,
 * identically for every provider, so scores stay comparable and explainable
 * (see `MetadataMatch.signals`).
 */
export type MetadataCandidate = {
  /** The record, normalized into the cross-format vocabulary. */
  readonly metadata: ResolvedMetadata
  /**
   * Provider-native record id, stable across fetches (an Open Library work
   * key, a MangaDex uuid…). Used by consumers to pin a user-confirmed match.
   */
  readonly id?: string
  /** Canonical url of the record, for attribution and deep links. */
  readonly url?: string
  /**
   * The provider's own record as it parsed it — provenance and the escape
   * hatch for provider-specific fields with no home in the vocabulary. Kept
   * in the result only when `includeRaw` is on.
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
  /**
   * Stable machine id, unique across the providers of one fetch — it keys the
   * result's `sources`.
   */
  readonly id: string
  /** Human-readable name, for attribution in a UI. */
  readonly name: string
  /**
   * Returns the candidates the catalog has for this book, best-effort: an
   * empty list when the metadata carries nothing the provider can search on,
   * or when the catalog knows nothing. Throwing is allowed — a failing
   * provider never fails the fetch, it lands in `failedProviders`.
   */
  readonly search: (
    metadata: ResolvedMetadata,
    context: MetadataProviderContext,
  ) => Promise<ReadonlyArray<MetadataCandidate>>
}
