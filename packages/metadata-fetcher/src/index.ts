/**
 * Fetches a book's metadata from online catalogs — what the world knows about
 * it, as opposed to what its file carries.
 *
 * ```ts
 * import { resolveArchive } from "@prose-reader/archive-reader"
 * import {
 *   createOpenLibraryProvider,
 *   createProjectGutenbergProvider,
 *   fetchMetadata,
 * } from "@prose-reader/metadata-fetcher"
 *
 * const resolved = await resolveArchive(archive)
 * const fetched = await fetchMetadata(resolved, {
 *   providers: [
 *     createProjectGutenbergProvider(),
 *     createOpenLibraryProvider(),
 *   ],
 * })
 * ```
 *
 * Providers are the extension point: implement {@link MetadataProvider} and
 * pass it in. Scoring, ranking, merging and error handling stay here,
 * identical for every provider.
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
export type { ProjectGutenbergProviderOptions } from "./providers/projectGutenberg/createProjectGutenbergProvider.ts"
export {
  createProjectGutenbergProvider,
  PROJECT_GUTENBERG_PROVIDER_ID,
} from "./providers/projectGutenberg/createProjectGutenbergProvider.ts"
export {
  PROJECT_GUTENBERG_IDENTIFIER_SCHEME,
  projectGutenbergLookupFromMetadata,
} from "./providers/projectGutenberg/identifier.ts"
export type {
  ProjectGutenbergContributor,
  ProjectGutenbergCover,
  ProjectGutenbergRecord,
} from "./providers/projectGutenberg/parse.ts"
export { parseProjectGutenbergRdf } from "./providers/projectGutenberg/parse.ts"
export {
  PROJECT_GUTENBERG_MAX_SUBJECTS,
  projectGutenbergMetadataHomes,
  resolveProjectGutenbergRecord,
} from "./providers/projectGutenberg/resolve.ts"
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
