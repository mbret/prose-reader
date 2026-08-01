import type { ResolvedMetadata } from "@prose-reader/archive-reader"
import { scoreMetadataCandidate } from "./match/scoreMetadataCandidate"
import { mergeResolvedMetadata } from "./merge/mergeResolvedMetadata"
import { buildMetadataQuery } from "./query/buildMetadataQuery"
import { Report } from "./report"
import type {
  FetchedMetadata,
  FetchedMetadataSource,
} from "./types/fetchedMetadata"
import type { MetadataMatch } from "./types/match"
import type { MetadataCandidate, MetadataProvider } from "./types/provider"
import { omitUndefined } from "./utils/omitUndefined"

/**
 * What to look the book up by. A {@link ResolvedMetadata} — or anything
 * carrying one, which is exactly the `ResolvedArchive` shape, so the output of
 * `resolveArchive` goes straight in:
 *
 * ```ts
 * const resolved = await resolveArchive(archive)
 * const fetched = await fetchMetadata(resolved, { providers })
 *
 * // …or hand-built terms, when there is no container to resolve
 * const fetched = await fetchMetadata({ title: "Dune" }, { providers })
 * ```
 */
export type FetchMetadataInput =
  | ResolvedMetadata
  | { readonly metadata: ResolvedMetadata }

export type FetchMetadataOptions = {
  /**
   * The catalogs to ask, queried concurrently. Their order is the tie-break
   * precedence: equally-scored matches rank in the order declared here, and
   * that ranking drives the merged `metadata`.
   */
  readonly providers: ReadonlyArray<MetadataProvider>
  /**
   * Hard cap on the matches kept **per provider**, best-scoring first, and
   * the page-size hint passed to each provider. Defaults to `5`.
   */
  readonly limit?: number
  /**
   * Score a match must reach to be `accepted` — to contribute to the merged
   * `metadata`. Defaults to `0.5`. Below it, matches are still returned,
   * ranked, for a consumer to offer as "did you mean?".
   */
  readonly minScore?: number
  /**
   * Keep each provider's own record on the matches (`match.raw`). Defaults to
   * `false`: it is provenance most consumers don't need, and it can dwarf the
   * normalized entity they persist.
   */
  readonly includeRaw?: boolean
  /** Cancellation signal, forwarded to every provider. */
  readonly signal?: AbortSignal
}

const DEFAULT_LIMIT = 5
const DEFAULT_MIN_SCORE = 0.5
const FETCHED_METADATA_VERSION = 1

const toMatch = ({
  candidate,
  providerId,
  score,
  signals,
  accepted,
  includeRaw,
}: {
  candidate: MetadataCandidate
  providerId: string
  score: number
  signals: MetadataMatch["signals"]
  accepted: boolean
  includeRaw: boolean
}): MetadataMatch =>
  omitUndefined({
    providerId,
    score,
    signals,
    accepted,
    metadata: candidate.metadata,
    id: candidate.id,
    url: candidate.url,
    raw: includeRaw ? candidate.raw : undefined,
  })

/**
 * Asks every provider what it knows about a book, scores what comes back
 * against what we already knew, and merges the convincing answers into one
 * {@link ResolvedMetadata} — the same vocabulary `resolveArchive` produces, so
 * remote and embedded metadata stay interchangeable.
 *
 * ```ts
 * import { resolveArchive } from "@prose-reader/archive-reader"
 * import {
 *   createOpenLibraryProvider,
 *   fetchMetadata,
 *   mergeResolvedMetadata,
 * } from "@prose-reader/metadata-fetcher"
 *
 * const resolved = await resolveArchive(archive)
 * const fetched = await fetchMetadata(resolved, {
 *   providers: [createOpenLibraryProvider()],
 * })
 *
 * // what the catalogs found, and why we believe it
 * fetched.metadata.cover?.uri
 * fetched.matches[0]?.signals // [{ field: "isbn", score: 1, … }, …]
 *
 * // the book wins, the catalogs fill its gaps
 * const metadata = mergeResolvedMetadata(resolved.metadata, fetched.metadata)
 * ```
 *
 * Error policy mirrors `resolveArchive`: a provider that throws never fails
 * the fetch — it is logged through the debug `Report` and listed in
 * `failedProviders`. An abort is the exception: cancelling through `signal`
 * rejects, since the caller asked for it.
 */
export const fetchMetadata = async (
  input: FetchMetadataInput,
  options: FetchMetadataOptions,
): Promise<FetchedMetadata> => {
  const metadata = "metadata" in input ? input.metadata : input
  const limit = options.limit ?? DEFAULT_LIMIT
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE
  const includeRaw = options.includeRaw === true
  const query = buildMetadataQuery(metadata)

  const results = await Promise.all(
    options.providers.map(async (provider) => {
      try {
        const candidates = await provider.search(query, {
          limit,
          signal: options.signal,
        })

        return { provider, candidates }
      } catch (error) {
        // the caller pulled the plug: their cancellation, their rejection
        if (options.signal?.aborted === true) throw error

        // catalogs in the wild are flaky: a failing provider never fails the
        // fetch, it just doesn't contribute
        Report.error(`fetchMetadata: provider "${provider.id}" failed`, error)

        return { provider, candidates: undefined }
      }
    }),
  )

  const failedProviders = results
    .filter((result) => result.candidates === undefined)
    .map((result) => result.provider.id)

  const sources: Record<string, FetchedMetadataSource> = {}
  const matches: MetadataMatch[] = []

  for (const { provider, candidates } of results) {
    if (candidates === undefined) continue

    const providerMatches = candidates
      .map((candidate) => {
        const { score, signals } = scoreMetadataCandidate(
          query,
          candidate.metadata,
        )

        return toMatch({
          candidate,
          providerId: provider.id,
          score,
          signals,
          accepted: score >= minScore,
          includeRaw,
        })
      })
      // `sort` is stable, so equally-scored candidates keep the order the
      // provider ranked them in
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    // ids key `sources`, so a duplicate would silently drop a provider's
    // detail — the kind of thing that costs an hour to notice
    if (sources[provider.id] !== undefined) {
      Report.warn(
        `fetchMetadata: several providers share the id "${provider.id}"`,
      )
    }

    sources[provider.id] = {
      provider: { id: provider.id, name: provider.name },
      matches: providerMatches,
    }

    matches.push(...providerMatches)
  }

  // again stable: providers were walked in declaration order, so that order
  // breaks ties between equally convincing catalogs
  const rankedMatches = [...matches].sort((a, b) => b.score - a.score)

  return {
    version: FETCHED_METADATA_VERSION,
    metadata: mergeResolvedMetadata(
      ...rankedMatches
        .filter((match) => match.accepted)
        .map((match) => match.metadata),
    ),
    matches: rankedMatches,
    sources,
    failedProviders,
  }
}
