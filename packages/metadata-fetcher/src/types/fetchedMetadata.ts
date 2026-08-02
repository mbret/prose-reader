import type { MetadataMatch } from "./match.ts"

/**
 * What one provider had to say: every candidate, with the provider identity
 * needed to present or revisit those results independently.
 */
export type FetchedMetadataSource = {
  readonly provider: {
    readonly id: string
    readonly name: string
  }
  /**
   * Every candidate the provider returned, scored, ranked best-first and
   * capped to `limit` — rejected ones included, since "found three books, none
   * convincing" is an answer rather than an absence.
   */
  readonly matches: ReadonlyArray<MetadataMatch>
}

/**
 * Per-provider detail, keyed by {@link MetadataProvider.id}. Open-ended:
 * unlike the closed set of archive sources, the keys are whatever providers
 * you passed.
 */
export type FetchedMetadataSources = Readonly<
  Record<string, FetchedMetadataSource>
>

export type FailedMetadataProvider = {
  readonly id: string
  /**
   * Set when the failure was a response rather than a network error, a
   * malformed payload or a bug — the difference between "rate limited, ask
   * again later" (`429`), "the catalog is down" (`5xx`) and "we asked wrong"
   * (`4xx`), which a bare "it failed" cannot express.
   *
   * Providers report it by throwing `MetadataProviderResponseError`, or any
   * error carrying a numeric `status`.
   */
  readonly status?: number
}

/**
 * What remote catalogs found for a book, kept as ranked alternatives rather
 * than consolidated into a potentially synthetic record. The entity is plain
 * JSON: structured-clone-able, persistable and cacheable.
 */
export type FetchedMetadata = {
  /**
   * Schema version, for consumers persisting the entity. Bumped only when the
   * shape or meaning of existing fields changes incompatibly.
   */
  readonly version: number
  /**
   * Every match across every provider, ranked best-first — the list a "did you
   * mean?" picker renders. Ties keep the order the providers were declared in,
   * so that order doubles as your tie-break precedence.
   */
  readonly matches: ReadonlyArray<MetadataMatch>
  readonly sources: FetchedMetadataSources
  /**
   * Providers whose search threw, each with its HTTP `status` when the catalog
   * answered with one. Always present, and the only trace a swallowed failure
   * leaves — a consumer refusing to cache a partial answer needs it.
   *
   * ```ts
   * const input = metadataInputFromResolvedArchive(resolved)
   * const fetched = await fetchMetadata(input, { providers })
   *
   * // don't persist "we found nothing" when we simply couldn't ask
   * if (fetched.failedProviders.length === 0) cache.set(bookId, fetched)
   *
   * // rate limited rather than broken: worth asking again, later
   * const throttled = fetched.failedProviders.filter(({ status }) => status === 429)
   * ```
   */
  readonly failedProviders: ReadonlyArray<FailedMetadataProvider>
}
