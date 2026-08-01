import type {
  MetadataCandidate,
  MetadataProvider,
  MetadataProviderContext,
  MetadataQuery,
} from "../../types/provider"
import { type OpenLibraryDoc, parseOpenLibrarySearchResponse } from "./parse"
import { resolveOpenLibraryDoc } from "./resolve"

export const OPEN_LIBRARY_PROVIDER_ID = "openLibrary"

const DEFAULT_BASE_URL = "https://openlibrary.org"
const DEFAULT_COVERS_BASE_URL = "https://covers.openlibrary.org"

/**
 * Only what {@link resolveOpenLibraryDoc} maps. `search.json` returns a very
 * wide document by default (every edition key, every IA identifier…), and the
 * `fields` parameter is the difference between a few hundred bytes per hit
 * and a few hundred kilobytes.
 */
const SEARCH_FIELDS = [
  "key",
  "title",
  "subtitle",
  "author_name",
  "first_publish_year",
  "publisher",
  "language",
  "subject",
  "number_of_pages_median",
  "cover_i",
].join(",")

export type OpenLibraryProviderOptions = {
  /** API origin. Defaults to `https://openlibrary.org`. */
  readonly baseUrl?: string
  /** Cover service origin. Defaults to `https://covers.openlibrary.org`. */
  readonly coversBaseUrl?: string
  /**
   * `fetch` implementation, for tests, a custom agent, or a caching layer.
   * Defaults to the global one.
   */
  readonly fetch?: typeof globalThis.fetch
  /**
   * Sent as `User-Agent`. Open Library's API etiquette asks for an
   * identifying one (app name + contact) and throttles anonymous traffic
   * harder.
   */
  readonly userAgent?: string
}

/**
 * Terms to send to `search.json`, or `undefined` when the query carries
 * nothing the endpoint can search on.
 */
const searchTerms = (
  query: MetadataQuery,
): Record<string, string> | undefined => {
  if (query.title === undefined) return undefined

  const author = query.authors?.[0]

  return {
    title: query.title,
    ...(author !== undefined ? { author } : {}),
  }
}

/**
 * Open Library — the Internet Archive's open bibliographic catalog. Free, no
 * key, covers books broadly (much less so comics and manga).
 *
 * ```ts
 * const provider = createOpenLibraryProvider({
 *   userAgent: "MyReader/1.0 (contact@example.com)",
 * })
 * ```
 *
 * Lookup strategy, at most two requests: an **ISBN search** when the book
 * states one — the catalog then verifies the identity for us — falling back
 * to a **title (+ first author) search** when the ISBN is unknown to it or
 * absent. A query with neither an ISBN nor a title yields no candidates
 * rather than a fishing expedition.
 */
export const createOpenLibraryProvider = (
  options: OpenLibraryProviderOptions = {},
): MetadataProvider => {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL
  const coversBaseUrl = options.coversBaseUrl ?? DEFAULT_COVERS_BASE_URL

  const searchDocs = async (
    terms: Record<string, string>,
    context: MetadataProviderContext,
  ): Promise<ReadonlyArray<OpenLibraryDoc>> => {
    const url = new URL("/search.json", baseUrl)

    for (const [key, value] of Object.entries(terms)) {
      url.searchParams.set(key, value)
    }

    url.searchParams.set("fields", SEARCH_FIELDS)
    url.searchParams.set("limit", String(context.limit))

    // read lazily so a consumer stubbing the global after building the
    // provider still wins
    const doFetch = options.fetch ?? globalThis.fetch
    const response = await doFetch(url.toString(), {
      signal: context.signal,
      headers: {
        Accept: "application/json",
        ...(options.userAgent !== undefined
          ? { "User-Agent": options.userAgent }
          : {}),
      },
    })

    if (!response.ok) {
      throw new Error(
        `Open Library search failed with status ${response.status}`,
      )
    }

    return parseOpenLibrarySearchResponse(await response.json())
  }

  const toCandidates = (
    docs: ReadonlyArray<OpenLibraryDoc>,
    isbn: string | undefined,
  ): ReadonlyArray<MetadataCandidate> =>
    docs.map((doc) => ({
      metadata: resolveOpenLibraryDoc(doc, { coversBaseUrl, isbn }),
      id: doc.key,
      url: doc.key !== undefined ? `${baseUrl}${doc.key}` : undefined,
      raw: doc,
    }))

  return {
    id: OPEN_LIBRARY_PROVIDER_ID,
    name: "Open Library",
    search: async (query, context) => {
      const { isbn } = query

      if (isbn !== undefined) {
        const docs = await searchDocs({ isbn }, context)

        if (docs.length > 0) return toCandidates(docs, isbn)
      }

      const terms = searchTerms(query)

      if (terms === undefined) return []

      return toCandidates(await searchDocs(terms, context), undefined)
    },
  }
}
