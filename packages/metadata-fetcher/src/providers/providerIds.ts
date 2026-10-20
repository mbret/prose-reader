/**
 * The built-in providers' ids, the keys of `FetchedMetadata.sources` and the
 * `providerId` of their matches.
 *
 * Kept apart from the providers themselves: a consumer that only reads
 * fetched results, a browser app rendering stored matches for instance, needs
 * the ids without the catalog clients and their parsing dependencies.
 */
export const GOOGLE_BOOKS_PROVIDER_ID = "googleBooks"
export const OPEN_LIBRARY_PROVIDER_ID = "openLibrary"
export const PROJECT_GUTENBERG_PROVIDER_ID = "projectGutenberg"
