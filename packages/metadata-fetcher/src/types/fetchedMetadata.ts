import type { ResolvedMetadata } from "@prose-reader/archive-reader"
import type { MetadataMatch } from "./match.ts"

/**
 * What one provider had to say — the twin of `ResolvedArchiveSources`, with
 * the same contract: everything a provider contributed is also represented,
 * merged, in {@link FetchedMetadata.metadata}, so a wrong precedence opinion
 * stays revisable because the per-provider values never left the entity.
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
 * What remote catalogs know about a book — the equivalent of `ResolvedArchive`
 * and just as plain: structured-clone-able, persistable, cacheable.
 */
export type FetchedMetadata = {
  /**
   * Schema version, for consumers persisting the entity. Bumped only when the
   * shape or meaning of existing fields changes incompatibly.
   */
  readonly version: number
  /**
   * What the providers found, merged field-wise with the highest-scoring
   * accepted match winning. Empty when nothing matched confidently enough.
   *
   * **Only** the remote answer: the local metadata is deliberately not folded
   * in, so a consumer decides who wins.
   *
   * ```ts
   * // trust the book over the catalog, fill the gaps from the catalog
   * const metadata = mergeResolvedMetadata(resolved.metadata, fetched.metadata)
   * ```
   */
  readonly metadata: ResolvedMetadata
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
   * const fetched = await fetchMetadata(resolved, { providers })
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
