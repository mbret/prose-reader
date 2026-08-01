import type {
  ResolvedDate,
  ResolvedMetadata,
} from "@prose-reader/archive-reader"

/** One entry of {@link ResolvedMetadata.identifiers}. */
export type MetadataIdentifier = NonNullable<
  ResolvedMetadata["identifiers"]
>[number]

/**
 * What we know about the book locally, reduced to the terms a remote catalog
 * can actually search on. Built from a {@link ResolvedMetadata} by
 * `buildMetadataQuery`, so a provider never has to walk the union vocabulary
 * (roles, collections, format-scoped corners…) to find a title and an author.
 *
 * Every field is optional — a query is best-effort by nature: a CBZ with no
 * sidecar may only offer a title, an EPUB may only offer an identifier. Values
 * are trimmed and empty ones collapse to absent, so `field !== undefined` is a
 * reliable presence check (same rule as {@link ResolvedMetadata}).
 */
export type MetadataQuery = {
  readonly title?: string
  /**
   * Contributors credited as `author`, in source order; when the publication
   * credits nobody as an author, every contributor's name (a comic archive
   * often only lists a penciler).
   */
  readonly authors?: ReadonlyArray<string>
  readonly isbn?: string
  readonly gtin?: string
  readonly identifiers?: ReadonlyArray<MetadataIdentifier>
  /** Name of the first series the publication belongs to. */
  readonly series?: string
  readonly publisher?: string
  readonly languages?: ReadonlyArray<string>
  readonly published?: ResolvedDate
  readonly numberOfPages?: number
  /**
   * Everything known locally, verbatim — the escape hatch for a provider
   * needing more than the search terms above (a comic catalog keying off
   * `metadata.comic`, a store keying off `metadata.properties`…).
   */
  readonly metadata: ResolvedMetadata
}

/**
 * Per-search context handed to a provider alongside the query.
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
 * A pluggable metadata source. Implementing one is: pick a stable `id`, take
 * the query terms you can search on, return normalized candidates.
 *
 * ```ts
 * const myProvider: MetadataProvider = {
 *   id: "myCatalog",
 *   name: "My Catalog",
 *   search: async (query, { limit, signal }) => {
 *     if (query.title === undefined) return []
 *
 *     const response = await fetch(
 *       `https://example.com/search?q=${encodeURIComponent(query.title)}`,
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
   * Returns the candidates the catalog has for this query, best-effort: an
   * empty list when the query carries nothing the provider can search on, or
   * when the catalog knows nothing. Throwing is allowed — a failing provider
   * never fails the fetch, it lands in `failedProviders`.
   */
  readonly search: (
    query: MetadataQuery,
    context: MetadataProviderContext,
  ) => Promise<ReadonlyArray<MetadataCandidate>>
}
