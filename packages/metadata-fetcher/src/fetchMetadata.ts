import {
  DEFAULT_METADATA_MATCH_MIN_SCORE,
  type ScoredMetadataCandidate,
  scoreMetadataCandidate,
} from "./match/scoreMetadataCandidate.ts"
import { responseErrorStatus } from "./providers/responseError.ts"
import { Report } from "./report.ts"
import {
  type FailedMetadataProvider,
  FETCHED_METADATA_VERSION,
  type FetchedMetadata,
  type FetchedMetadataSource,
} from "./types/fetchedMetadata.ts"
import type { FetchMetadataInput } from "./types/fetchMetadataInput.ts"
import type { MetadataMatch } from "./types/match.ts"
import type { MetadataCandidate, MetadataProvider } from "./types/provider.ts"
import { omitUndefined } from "./utils/omitUndefined.ts"

export type FetchMetadataOptions = {
  /**
   * The catalogs to ask, queried concurrently. Their order is the tie-break
   * precedence: equally-scored matches rank in the order declared here.
   */
  readonly providers: ReadonlyArray<MetadataProvider>
  /**
   * Hard cap on the matches kept **per provider**, best first; also the
   * page-size hint each provider receives. Defaults to `5`.
   */
  readonly limit?: number
  /**
   * Score a match must reach to be `accepted`. Defaults to
   * {@link DEFAULT_METADATA_MATCH_MIN_SCORE}, `0.5`. Below it,
   * matches are still returned and ranked, for a consumer to offer as "did
   * you mean?".
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

type RankedCandidate = ScoredMetadataCandidate & {
  readonly candidate: MetadataCandidate
  /** Its place in the provider's results, which breaks ties of score. */
  readonly searchResultIndex: number
  readonly detailsFailure?: MetadataMatch["detailsFailure"]
}

type ProviderOutcome =
  | {
      readonly provider: MetadataProvider
      readonly matches: ReadonlyArray<MetadataMatch>
    }
  | { readonly searchFailure: FailedMetadataProvider }

const byScoreThenSearchResultIndex = (a: RankedCandidate, b: RankedCandidate) =>
  b.score - a.score || a.searchResultIndex - b.searchResultIndex

/**
 * Asks every provider what it knows about a book, scores the answers against
 * what you gave it, and returns the ranked candidates with the evidence behind
 * each score. The input contains only fields understood for lookup and
 * matching; candidates retain archive-reader's rich `ResolvedMetadata`
 * vocabulary, including catalog-only covers, descriptions and subjects.
 *
 * ```ts
 * import { resolveArchive } from "@prose-reader/archive-reader"
 * import {
 *   createGoogleBooksProvider,
 *   createOpenLibraryProvider,
 *   createProjectGutenbergProvider,
 *   fetchMetadata,
 *   metadataInputFromResolvedArchive,
 * } from "@prose-reader/metadata-fetcher"
 *
 * const resolved = await resolveArchive(archive)
 * const fetched = await fetchMetadata(metadataInputFromResolvedArchive(resolved), {
 *   providers: [
 *     createProjectGutenbergProvider(),
 *     createGoogleBooksProvider({ apiKey: "your-api-key" }),
 *     createOpenLibraryProvider(),
 *   ],
 * })
 *
 * // what the best accepted candidate says, and why we believe it
 * const match = fetched.matches.find(({ accepted }) => accepted)
 * match?.metadata.cover?.uri
 * match?.signals // [{ field: "isbn", score: 1, … }, …]
 * ```
 *
 * Error policy mirrors `resolveArchive`: a provider that throws never fails
 * the fetch — it is logged through the debug `Report` and listed in
 * `failedProviders`. A failed `fetchDetails` marks its match with
 * `detailsFailure` instead. An abort is the exception: cancelling through
 * `signal` rejects, since the caller asked for it.
 */
export const fetchMetadata = async (
  input: FetchMetadataInput,
  options: FetchMetadataOptions,
): Promise<FetchedMetadata> => {
  const limit = options.limit ?? DEFAULT_LIMIT
  const minScore = options.minScore ?? DEFAULT_METADATA_MATCH_MIN_SCORE
  const includeRaw = options.includeRaw === true
  const signal = options.signal

  const isAccepted = (score: number) => score >= minScore

  const rankCandidate = (
    candidate: MetadataCandidate,
    searchResultIndex: number,
  ): RankedCandidate => ({
    candidate,
    searchResultIndex,
    ...scoreMetadataCandidate(input, candidate.metadata),
  })

  const toMatch = (
    providerId: string,
    { candidate, score, signals, detailsFailure }: RankedCandidate,
  ): MetadataMatch =>
    omitUndefined({
      providerId,
      score,
      signals,
      accepted: isAccepted(score),
      metadata: candidate.metadata,
      id: candidate.id,
      url: candidate.url,
      raw: includeRaw ? candidate.raw : undefined,
      detailsFailure,
    })

  /**
   * Completes the provider's best match when it is accepted: that is the one a
   * consumer applies, and it bounds details to one call per provider.
   */
  const completeBestAcceptedCandidate = async (
    provider: MetadataProvider,
    best: RankedCandidate,
  ): Promise<RankedCandidate> => {
    const { fetchDetails } = best.candidate

    if (fetchDetails === undefined || !isAccepted(best.score)) return best

    try {
      const metadata = await fetchDetails({ signal })

      // scored again, so the signals describe the metadata the match carries
      return rankCandidate(
        { ...best.candidate, metadata },
        best.searchResultIndex,
      )
    } catch (error) {
      if (signal?.aborted === true) throw error

      Report.error(
        `fetchMetadata: provider "${provider.id}" failed to fetch a match's details`,
        error,
      )

      return {
        ...best,
        detailsFailure: omitUndefined({ status: responseErrorStatus(error) }),
      }
    }
  }

  const askProvider = async (
    provider: MetadataProvider,
  ): Promise<ProviderOutcome> => {
    let candidates: ReadonlyArray<MetadataCandidate>

    try {
      candidates = await provider.search(input, { limit, signal })
    } catch (error) {
      // the caller pulled the plug: their cancellation, their rejection
      if (signal?.aborted === true) throw error

      // catalogs in the wild are flaky: a failing provider never fails the
      // fetch, it just doesn't contribute. The status, when the catalog
      // answered with one, is what tells a rate limit from an outage.
      Report.error(`fetchMetadata: provider "${provider.id}" failed`, error)

      return {
        searchFailure: omitUndefined({
          id: provider.id,
          status: responseErrorStatus(error),
        }),
      }
    }

    const [best, ...others] = candidates
      .map((candidate, searchResultIndex) =>
        rankCandidate(candidate, searchResultIndex),
      )
      .sort(byScoreThenSearchResultIndex)
      .slice(0, limit)
    const ranked =
      best !== undefined
        ? [await completeBestAcceptedCandidate(provider, best), ...others].sort(
            byScoreThenSearchResultIndex,
          )
        : []

    return {
      provider,
      matches: ranked.map((candidate) => toMatch(provider.id, candidate)),
    }
  }

  const outcomes = await Promise.all(options.providers.map(askProvider))

  const failedProviders: FailedMetadataProvider[] = []
  const sources: Record<string, FetchedMetadataSource> = {}
  const matches: MetadataMatch[] = []

  for (const outcome of outcomes) {
    if ("searchFailure" in outcome) {
      failedProviders.push(outcome.searchFailure)

      continue
    }

    const { provider, matches: providerMatches } = outcome

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

  // `sort` is stable and providers were walked in declaration order, so that
  // order breaks ties between equally convincing catalogs
  const rankedMatches = [...matches].sort((a, b) => b.score - a.score)

  return {
    version: FETCHED_METADATA_VERSION,
    matches: rankedMatches,
    sources,
    failedProviders,
  }
}
