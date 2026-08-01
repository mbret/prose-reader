import type { ResolvedMetadata } from "@prose-reader/archive-reader"
import type { MetadataMatch } from "./match"

/**
 * What one provider had to say — the metadata-fetching twin of
 * `ResolvedArchiveSources`: the per-source detail behind the merged
 * `metadata`. Same contract as there: everything a provider contributed is
 * also represented, merged, in {@link FetchedMetadata.metadata}, so a wrong
 * precedence opinion is revisable without the per-provider values ever having
 * left the entity.
 */
export type FetchedMetadataSource = {
  /** Identity of the provider, for attribution in a UI. */
  readonly provider: {
    readonly id: string
    readonly name: string
  }
  /**
   * Every candidate the provider returned, scored and ranked best-first, then
   * capped to `limit`. Includes the rejected ones (`accepted: false`) — "the
   * catalog found three books, none convincing" is an answer, not an absence.
   */
  readonly matches: ReadonlyArray<MetadataMatch>
}

/**
 * Per-provider detail, keyed by {@link MetadataProvider.id}. Open-ended by
 * design: providers are pluggable, so unlike the closed set of archive
 * sources, the key space is whatever providers you passed.
 */
export type FetchedMetadataSources = Readonly<
  Record<string, FetchedMetadataSource>
>

/**
 * The fully fetched, plain-JSON view of what remote catalogs know about a
 * book — the metadata-fetching equivalent of `ResolvedArchive`:
 * structured-clone-able, persistable, cacheable, no handle attached.
 */
export type FetchedMetadata = {
  /**
   * Schema version of this entity, for consumers persisting it. Bumped only
   * when the shape or meaning of existing fields changes incompatibly;
   * additive growth (new optional fields) does not bump it.
   */
  readonly version: number
  /**
   * What the providers found, merged into the same cross-format vocabulary
   * the archive resolves into: field-wise, the highest-scoring accepted match
   * wins. Empty (`{}`) when nothing matched confidently enough.
   *
   * This is **only** the remote answer — the local metadata is deliberately
   * not folded in, so a consumer stays free to decide who wins:
   *
   * ```ts
   * // trust the book over the catalog, fill the gaps from the catalog
   * const metadata = mergeResolvedMetadata(resolved.metadata, fetched.metadata)
   * ```
   */
  readonly metadata: ResolvedMetadata
  /**
   * Every match across every provider, ranked best-first (ties keep the order
   * the providers were declared in, so that order doubles as your tie-break
   * precedence). The list a "did you mean?" picker renders.
   */
  readonly matches: ReadonlyArray<MetadataMatch>
  readonly sources: FetchedMetadataSources
  /**
   * Providers whose search threw — a network error, a rate limit, a malformed
   * response. Always present (empty when every provider answered): a failing
   * provider never fails the fetch, so this is the only trace left, and a
   * consumer refusing to cache a partial answer needs it.
   *
   * ```ts
   * const fetched = await fetchMetadata(resolved, { providers })
   *
   * // don't persist "we found nothing" when we simply couldn't ask
   * if (fetched.failedProviders.length === 0) cache.set(bookId, fetched)
   * ```
   */
  readonly failedProviders: ReadonlyArray<string>
}
