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

type ScoredCandidate = ScoredMetadataCandidate & {
  readonly candidate: MetadataCandidate
}

/** What one provider contributed: its matches when its search answered. */
type ProviderOutcome = {
  readonly provider: MetadataProvider
  readonly matches?: ReadonlyArray<MetadataMatch>
  readonly failure?: FailedMetadataProvider
}

const toMatch = ({
  scored: { candidate, score, signals },
  providerId,
  minScore,
  includeRaw,
}: {
  scored: ScoredCandidate
  providerId: string
  minScore: number
  includeRaw: boolean
}): MetadataMatch =>
  omitUndefined({
    providerId,
    score,
    signals,
    accepted: score >= minScore,
    metadata: candidate.metadata,
    id: candidate.id,
    url: candidate.url,
    raw: includeRaw ? candidate.raw : undefined,
  })

// `sort` is stable, so equally-scored candidates keep the order the provider
// ranked them in
const byScoreDescending = (a: { score: number }, b: { score: number }) =>
  b.score - a.score

const providerFailure = (
  provider: MetadataProvider,
  error: unknown,
): FailedMetadataProvider =>
  omitUndefined({ id: provider.id, status: responseErrorStatus(error) })

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
 * `failedProviders`. An abort is the exception: cancelling through `signal`
 * rejects, since the caller asked for it.
 */
export const fetchMetadata = async (
  input: FetchMetadataInput,
  options: FetchMetadataOptions,
): Promise<FetchedMetadata> => {
  const limit = options.limit ?? DEFAULT_LIMIT
  const minScore = options.minScore ?? DEFAULT_METADATA_MATCH_MIN_SCORE
  const includeRaw = options.includeRaw === true
  const signal = options.signal

  const scoreCandidate = (candidate: MetadataCandidate): ScoredCandidate => ({
    candidate,
    ...scoreMetadataCandidate(input, candidate.metadata),
  })

  /**
   * Completes an accepted candidate with the details its search left out, and
   * scores it again: the signals must describe the metadata the match carries.
   */
  const withDetails = async (
    provider: MetadataProvider,
    scored: ScoredCandidate,
  ): Promise<{ scored: ScoredCandidate; failure?: FailedMetadataProvider }> => {
    const { fetchDetails } = scored.candidate

    if (fetchDetails === undefined || scored.score < minScore) return { scored }

    try {
      const metadata = await fetchDetails({ signal })

      return { scored: scoreCandidate({ ...scored.candidate, metadata }) }
    } catch (error) {
      if (signal?.aborted === true) throw error

      // the match stays, with what search found: an answer short of its
      // details is still an answer, but not a complete one to persist
      Report.error(
        `fetchMetadata: provider "${provider.id}" failed to fetch a match's details`,
        error,
      )

      return { scored, failure: providerFailure(provider, error) }
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

      return { provider, failure: providerFailure(provider, error) }
    }

    const kept = candidates
      .map(scoreCandidate)
      .sort(byScoreDescending)
      .slice(0, limit)
    const completed = await Promise.all(
      kept.map((scored) => withDetails(provider, scored)),
    )

    return {
      provider,
      matches: completed
        .map(({ scored }) =>
          toMatch({ scored, providerId: provider.id, minScore, includeRaw }),
        )
        .sort(byScoreDescending),
      failure: completed.find(({ failure }) => failure !== undefined)?.failure,
    }
  }

  const outcomes = await Promise.all(options.providers.map(askProvider))

  const failedProviders: FailedMetadataProvider[] = outcomes.flatMap(
    ({ failure }) => (failure !== undefined ? [failure] : []),
  )

  const sources: Record<string, FetchedMetadataSource> = {}
  const matches: MetadataMatch[] = []

  for (const { provider, matches: providerMatches } of outcomes) {
    if (providerMatches === undefined) continue

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
    matches: rankedMatches,
    sources,
    failedProviders,
  }
}
