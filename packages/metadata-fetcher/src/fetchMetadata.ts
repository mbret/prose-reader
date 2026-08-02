import { scoreMetadataCandidate } from "./match/scoreMetadataCandidate.ts"
import { responseErrorStatus } from "./providers/responseError.ts"
import { Report } from "./report.ts"
import type {
  FailedMetadataProvider,
  FetchedMetadata,
  FetchedMetadataSource,
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
   * Score a match must reach to be `accepted`. Defaults to `0.5`. Below it,
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
const DEFAULT_MIN_SCORE = 0.5
const FETCHED_METADATA_VERSION = 4

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
 * what you gave it, and returns the ranked candidates with the evidence behind
 * each score. The input contains only fields understood for lookup and
 * matching; candidates retain archive-reader's rich `ResolvedMetadata`
 * vocabulary, including catalog-only covers, descriptions and subjects.
 *
 * ```ts
 * import { resolveArchive } from "@prose-reader/archive-reader"
 * import {
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
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE
  const includeRaw = options.includeRaw === true

  const results = await Promise.all(
    options.providers.map(async (provider) => {
      try {
        const candidates = await provider.search(input, {
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
          input,
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
    matches: rankedMatches,
    sources,
    failedProviders,
  }
}
