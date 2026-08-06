import type { MetadataProvider } from "../../types/provider.ts"
import { createGoogleBooksSearch } from "./search.ts"

export const GOOGLE_BOOKS_PROVIDER_ID = "googleBooks"

const DEFAULT_BASE_URL = "https://www.googleapis.com/books/v1"

export type GoogleBooksProviderOptions = {
  /** API key identifying the application to Google Books. */
  readonly apiKey: string
  /** API root. Defaults to `https://www.googleapis.com/books/v1`. */
  readonly baseUrl?: string
  /** For tests, a custom agent, or a caching layer. Defaults to the global one. */
  readonly fetch?: typeof globalThis.fetch
}

/**
 * Google Books' public volume catalog. An API key is required. Lookup order:
 * an exact `GoogleBooks` id/official URL, ISBN, then title plus first author
 * with a title-only fallback. Google relevance order is preserved here; the
 * shared fetcher scores every returned edition against the caller's input.
 */
export const createGoogleBooksProvider = (
  options: GoogleBooksProviderOptions,
): MetadataProvider => {
  const apiKey = options.apiKey.trim()

  if (apiKey.length === 0) {
    throw new Error("createGoogleBooksProvider requires a non-empty apiKey")
  }

  return {
    id: GOOGLE_BOOKS_PROVIDER_ID,
    name: "Google Books",
    search: createGoogleBooksSearch({
      apiKey,
      baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
      fetch: options.fetch ?? globalThis.fetch,
    }),
  }
}
