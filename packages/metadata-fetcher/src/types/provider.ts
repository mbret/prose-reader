import type { ResolvedMetadata } from "@prose-reader/archive-reader"
import type { FetchMetadataInput } from "./fetchMetadataInput.ts"

export type MetadataProviderContext = {
  /**
   * How many candidates the caller will keep. A hint for the provider's own
   * page size — the fetch enforces it as a hard cap after ranking anyway, so
   * returning more is allowed but wasteful.
   */
  readonly limit: number
  readonly signal?: AbortSignal
}

/**
 * One record a provider believes could be the book. A provider's whole job is
 * to search its catalog and normalize each hit into {@link ResolvedMetadata};
 * it does **not** score its own candidates — the fetch does that, identically
 * for everyone, so scores stay comparable.
 */
export type MetadataCandidate = {
  readonly metadata: ResolvedMetadata
  readonly id?: string
  readonly url?: string
  /**
   * The provider's own record — provenance, and the escape hatch for fields
   * with no home in the vocabulary. Kept only when `includeRaw` is on.
   */
  readonly raw?: unknown
}

/**
 * A pluggable metadata source. Implementing one is: pick a stable `id`, read
 * the terms you can search on out of the compact input, return normalized
 * candidates.
 *
 * Inputs contain only fields understood for lookup and matching. Returned
 * candidates remain rich {@link ResolvedMetadata} entities.
 *
 * ```ts
 * import { type MetadataProvider } from "@prose-reader/metadata-fetcher"
 *
 * const myProvider: MetadataProvider = {
 *   id: "myCatalog",
 *   name: "My Catalog",
 *   search: async (input, { limit, signal }) => {
 *     if (input.title === undefined) return []
 *
 *     const response = await fetch(
 *       `https://example.com/search?q=${encodeURIComponent(input.title)}` +
 *         `&author=${encodeURIComponent(input.authors?.[0] ?? "")}`,
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
  readonly name: string
  /**
   * The candidates the catalog has, best-effort: an empty list when there is
   * nothing to search on, or nothing found. Throwing is allowed — a failing
   * provider never fails the fetch, it lands in `failedProviders`.
   */
  readonly search: (
    input: FetchMetadataInput,
    context: MetadataProviderContext,
  ) => Promise<ReadonlyArray<MetadataCandidate>>
}
