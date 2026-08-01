/**
 * Fetches a book's metadata from online catalogs — what the world knows about
 * it, as opposed to what its file carries.
 *
 * {@link fetchMetadata} takes a `ResolvedMetadata` — or anything carrying one,
 * which is the `ResolvedArchive` shape `@prose-reader/archive-reader`
 * produces — asks a list of pluggable {@link MetadataProvider}s, scores every
 * candidate against what you gave it, and returns the same `ResolvedMetadata`
 * vocabulary back, plus the per-provider detail behind it.
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
export type {
  FetchMetadataInput,
  FetchMetadataOptions,
} from "./fetchMetadata.ts"
export { fetchMetadata } from "./fetchMetadata.ts"
export type { ScoredMetadataCandidate } from "./match/scoreMetadataCandidate.ts"
export {
  METADATA_MATCH_WEIGHTS,
  scoreMetadataCandidate,
} from "./match/scoreMetadataCandidate.ts"
export {
  normalizeForComparison,
  personNameSimilarity,
  textSimilarity,
  titleSimilarity,
} from "./match/similarity.ts"
export { mergeResolvedMetadata } from "./merge/mergeResolvedMetadata.ts"
export type { OpenLibraryProviderOptions } from "./providers/openLibrary/createOpenLibraryProvider.ts"
export {
  createOpenLibraryProvider,
  OPEN_LIBRARY_PROVIDER_ID,
} from "./providers/openLibrary/createOpenLibraryProvider.ts"
export { marcLanguageToBcp47 } from "./providers/openLibrary/marcLanguage.ts"
export type { OpenLibraryDoc } from "./providers/openLibrary/parse.ts"
export { parseOpenLibrarySearchResponse } from "./providers/openLibrary/parse.ts"
export {
  OPEN_LIBRARY_IDENTIFIER_SCHEME,
  OPEN_LIBRARY_MAX_SUBJECTS,
  openLibraryMetadataHomes,
  resolveOpenLibraryDoc,
} from "./providers/openLibrary/resolve.ts"
export {
  MetadataProviderResponseError,
  responseErrorStatus,
} from "./providers/responseError.ts"
export type {
  FailedMetadataProvider,
  FetchedMetadata,
  FetchedMetadataSource,
  FetchedMetadataSources,
} from "./types/fetchedMetadata.ts"
export type {
  MetadataMatch,
  MetadataMatchField,
  MetadataMatchSignal,
} from "./types/match.ts"
export type {
  MetadataCandidate,
  MetadataIdentifier,
  MetadataProvider,
  MetadataProviderContext,
} from "./types/provider.ts"
export { hasSearchTerms } from "./utils/hasSearchTerms.ts"
export { metadataAuthors } from "./utils/metadataAuthors.ts"
export { toIsbn13 } from "./utils/toIsbn13.ts"
