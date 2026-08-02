import type { ResolvedMetadata } from "@prose-reader/archive-reader"
import { scoreMetadataCandidate } from "./match/scoreMetadataCandidate.ts"
import { mergeResolvedMetadata } from "./merge/mergeResolvedMetadata.ts"
import { responseErrorStatus } from "./providers/responseError.ts"
import { Report } from "./report.ts"
import type {
  FailedMetadataProvider,
  FetchedMetadata,
  FetchedMetadataSource,
} from "./types/fetchedMetadata.ts"
import type { MetadataMatch } from "./types/match.ts"
import type { MetadataCandidate, MetadataProvider } from "./types/provider.ts"
import { omitUndefined } from "./utils/omitUndefined.ts"

/**
 * A {@link ResolvedMetadata}, or anything carrying one — the `ResolvedArchive`
 * shape, so the output of `resolveArchive` goes straight in. Hand-built terms
 * (`{ title: "Dune" }`) work too, when there is no container to resolve.
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
   * Hard cap on the matches kept **per provider**, best first; also the
   * page-size hint each provider receives. Defaults to `5`.
   */
  readonly limit?: number
  /**
   * Score a match must reach to be `accepted`, and so contribute to the merged
   * `metadata`. Defaults to `0.5`. Below it, matches are still returned and
   * ranked, for a consumer to offer as "did you mean?".
   */
  readonly minScore?: number
  /**
   * Keep each provider's own record on `match.raw`. Defaults to `false`: it is
   * provenance most consumers don't need, and can dwarf what they persist.
   */
  readonly includeRaw?: boolean
  readonly signal?: AbortSignal
}

const DEFAULT_LIMIT = 5
const DEFAULT_MIN_SCORE = 0.5
const FETCHED_METADATA_VERSION = 2

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
 * Asks every provider what it knows about a book, scores the answers against
 * what you gave it, and merges the convincing ones into a single
 * {@link ResolvedMetadata} — the vocabulary `resolveArchive` produces, so
 * remote and embedded metadata stay interchangeable.
 *
 * ```ts
 * import { resolveArchive } from "@prose-reader/archive-reader"
 * import {
 *   createOpenLibraryProvider,
 *   createProjectGutenbergProvider,
 *   fetchMetadata,
 *   mergeResolvedMetadata,
 * } from "@prose-reader/metadata-fetcher"
 *
 * const resolved = await resolveArchive(archive)
 * const fetched = await fetchMetadata(resolved, {
 *   providers: [
 *     createProjectGutenbergProvider(),
 *     createOpenLibraryProvider(),
 *   ],
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

  const results = await Promise.all(
    options.providers.map(async (provider) => {
      try {
        const candidates = await provider.search(metadata, {
          limit,
          signal: options.signal,
        })

        return { provider, candidates, failure: undefined }
      } catch (error) {
        // the caller pulled the plug: their cancellation, their rejection
        if (options.signal?.aborted === true) throw error

        // catalogs in the wild are flaky: a failing provider never fails the
        // fetch, it just doesn't contribute. The status, when the catalog
        // answered with one, is what tells a rate limit from an outage.
        Report.error(`fetchMetadata: provider "${provider.id}" failed`, error)

        return {
          provider,
          candidates: undefined,
          failure: omitUndefined({
            id: provider.id,
            status: responseErrorStatus(error),
          }),
        }
      }
    }),
  )

  const failedProviders: FailedMetadataProvider[] = results.flatMap((result) =>
    result.failure !== undefined ? [result.failure] : [],
  )

  const sources: Record<string, FetchedMetadataSource> = {}
  const matches: MetadataMatch[] = []

  for (const { provider, candidates } of results) {
    if (candidates === undefined) continue

    const providerMatches = candidates
      .map((candidate) => {
        const { score, signals } = scoreMetadataCandidate(
          metadata,
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
