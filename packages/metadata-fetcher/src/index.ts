/**
 * Fetches a book's metadata from online catalogs — what the world knows about
 * it, as opposed to what its file carries.
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
 * ```
 *
 * Providers are the extension point: implement {@link MetadataProvider} and
 * pass it in. Scoring, ranking and error handling stay here, identical for
 * every provider.
 */

export type {
  KnownMetadataIdentifierScheme,
  MetadataIdentifier,
  MetadataIdentifierScheme,
} from "@prose-reader/archive-reader"
export type { FetchMetadataOptions } from "./fetchMetadata.ts"
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
export { metadataInputFromResolvedArchive } from "./metadataInputFromResolvedArchive.ts"
export type { GoogleBooksProviderOptions } from "./providers/googleBooks/createGoogleBooksProvider.ts"
export {
  createGoogleBooksProvider,
  GOOGLE_BOOKS_PROVIDER_ID,
} from "./providers/googleBooks/createGoogleBooksProvider.ts"
export type { GoogleBooksLookup } from "./providers/googleBooks/identifier.ts"
export {
  GOOGLE_BOOKS_IDENTIFIER_SCHEME,
  googleBooksLookupFromInput,
} from "./providers/googleBooks/identifier.ts"
export type {
  GoogleBooksImageLinks,
  GoogleBooksIndustryIdentifier,
  GoogleBooksSeriesInfo,
  GoogleBooksVolume,
  GoogleBooksVolumeInfo,
} from "./providers/googleBooks/parse.ts"
export {
  parseGoogleBooksVolume,
  parseGoogleBooksVolumesResponse,
} from "./providers/googleBooks/parse.ts"
export type { ResolveGoogleBooksVolumeOptions } from "./providers/googleBooks/resolve.ts"
export {
  GOOGLE_BOOKS_MAX_SUBJECTS,
  googleBooksCoverUrl,
  googleBooksVolumeUrl,
  resolveGoogleBooksVolume,
} from "./providers/googleBooks/resolve.ts"
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
  resolveOpenLibraryDoc,
} from "./providers/openLibrary/resolve.ts"
export type { ProjectGutenbergProviderOptions } from "./providers/projectGutenberg/createProjectGutenbergProvider.ts"
export {
  createProjectGutenbergProvider,
  PROJECT_GUTENBERG_PROVIDER_ID,
} from "./providers/projectGutenberg/createProjectGutenbergProvider.ts"
export {
  PROJECT_GUTENBERG_IDENTIFIER_SCHEME,
  projectGutenbergLookupFromInput,
} from "./providers/projectGutenberg/identifier.ts"
export type {
  ProjectGutenbergContributor,
  ProjectGutenbergCover,
  ProjectGutenbergRecord,
} from "./providers/projectGutenberg/parse.ts"
export { parseProjectGutenbergRdf } from "./providers/projectGutenberg/parse.ts"
export {
  PROJECT_GUTENBERG_MAX_SUBJECTS,
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
export type { FetchMetadataInput } from "./types/fetchMetadataInput.ts"
export type {
  MetadataMatch,
  MetadataMatchField,
  MetadataMatchSignal,
} from "./types/match.ts"
export type {
  MetadataCandidate,
  MetadataProvider,
  MetadataProviderContext,
} from "./types/provider.ts"
export { hasSearchTerms } from "./utils/hasSearchTerms.ts"
export { metadataAuthors } from "./utils/metadataAuthors.ts"
export type { RetryWithBackoffOptions } from "./utils/retryWithBackoff.ts"
export { retryWithBackoff } from "./utils/retryWithBackoff.ts"
export { toIsbn13 } from "./utils/toIsbn13.ts"
