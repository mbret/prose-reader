/**
 * The "what we know about a book in → what the catalogs know out" package:
 * {@link fetchMetadata} takes a `ResolvedMetadata` — or anything carrying one,
 * which is the `ResolvedArchive` shape `@prose-reader/archive-reader`
 * produces — asks a list of pluggable {@link MetadataProvider}s, scores every
 * candidate against what the book itself said, and returns the same
 * `ResolvedMetadata` vocabulary back, plus the per-provider detail behind it.
 *
 * ```ts
 * import { resolveArchive } from "@prose-reader/archive-reader"
 * import {
 *   createOpenLibraryProvider,
 *   fetchMetadata,
 * } from "@prose-reader/metadata-fetcher"
 *
 * const resolved = await resolveArchive(archive)
 * const fetched = await fetchMetadata(resolved, {
 *   providers: [createOpenLibraryProvider()],
 * })
 * ```
 *
 * Providers are the extension point: implement {@link MetadataProvider}
 * (`id`, `name`, `search`) and pass it in. Scoring, ranking, merging and
 * error handling stay in the package, identically for every provider.
 */
export type { FetchMetadataInput, FetchMetadataOptions } from "./fetchMetadata"
export { fetchMetadata } from "./fetchMetadata"
export type { ScoredMetadataCandidate } from "./match/scoreMetadataCandidate"
export {
  METADATA_MATCH_WEIGHTS,
  scoreMetadataCandidate,
} from "./match/scoreMetadataCandidate"
export {
  normalizeForComparison,
  personNameSimilarity,
  textSimilarity,
  titleSimilarity,
} from "./match/similarity"
export { mergeResolvedMetadata } from "./merge/mergeResolvedMetadata"
export type { OpenLibraryProviderOptions } from "./providers/openLibrary/createOpenLibraryProvider"
export {
  createOpenLibraryProvider,
  OPEN_LIBRARY_PROVIDER_ID,
} from "./providers/openLibrary/createOpenLibraryProvider"
export { marcLanguageToBcp47 } from "./providers/openLibrary/marcLanguage"
export type { OpenLibraryDoc } from "./providers/openLibrary/parse"
export { parseOpenLibrarySearchResponse } from "./providers/openLibrary/parse"
export {
  OPEN_LIBRARY_IDENTIFIER_SCHEME,
  OPEN_LIBRARY_MAX_SUBJECTS,
  openLibraryMetadataHomes,
  resolveOpenLibraryDoc,
} from "./providers/openLibrary/resolve"
export { buildMetadataQuery } from "./query/buildMetadataQuery"
export type {
  FetchedMetadata,
  FetchedMetadataSource,
  FetchedMetadataSources,
} from "./types/fetchedMetadata"
export type {
  MetadataMatch,
  MetadataMatchField,
  MetadataMatchSignal,
} from "./types/match"
export type {
  MetadataCandidate,
  MetadataIdentifier,
  MetadataProvider,
  MetadataProviderContext,
  MetadataQuery,
} from "./types/provider"
export { toIsbn13 } from "./utils/toIsbn13"
