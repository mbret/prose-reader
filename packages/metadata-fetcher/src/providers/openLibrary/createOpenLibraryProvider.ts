import type { FetchMetadataInput } from "../../types/fetchMetadataInput.ts"
import type {
  MetadataCandidate,
  MetadataProvider,
  MetadataProviderContext,
} from "../../types/provider.ts"
import {
  type ProjectGutenbergLookup,
  projectGutenbergLookupFromInput,
} from "../projectGutenberg/identifier.ts"
import { MetadataProviderResponseError } from "../responseError.ts"
import { type OpenLibraryDoc, parseOpenLibrarySearchResponse } from "./parse.ts"
import { resolveOpenLibraryDoc } from "./resolve.ts"

export const OPEN_LIBRARY_PROVIDER_ID = "openLibrary"

const DEFAULT_BASE_URL = "https://openlibrary.org"
const DEFAULT_COVERS_BASE_URL = "https://covers.openlibrary.org"

/**
 * Only what {@link resolveOpenLibraryDoc} maps: `search.json` returns every
 * edition key and IA identifier by default, so `fields` is the difference
 * between a few hundred bytes per hit and a few hundred kilobytes.
 */
const SEARCH_FIELDS = [
  "key",
  "title",
  "subtitle",
  "author_name",
  "first_publish_year",
  "language",
  "subject",
  "number_of_pages_median",
  "cover_i",
  "id_project_gutenberg",
].join(",")

export type OpenLibraryProviderOptions = {
  /** API origin. Defaults to `https://openlibrary.org`. */
  readonly baseUrl?: string
  /** Cover service origin. Defaults to `https://covers.openlibrary.org`. */
  readonly coversBaseUrl?: string
  /** For tests, a custom agent, or a caching layer. Defaults to the global one. */
  readonly fetch?: typeof globalThis.fetch
  /**
   * Open Library's API etiquette asks for an identifying `User-Agent` (app
   * name + contact) and throttles anonymous traffic harder.
   */
  readonly userAgent?: string
}

const searchTerms = (
  input: FetchMetadataInput,
): Record<string, string> | undefined => {
  const title = input.title?.trim()

  if (title === undefined || title.length === 0) return undefined

  const author = input.authors?.find((value) => value.trim().length > 0)?.trim()

  return {
    title,
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
 * Lookup strategy, at most three requests: an **ISBN search** when the book
 * states one; an exact **Project Gutenberg id search** when an identifier is
 * an official Gutenberg URL; then a **title (+ first author) search**. A query
 * with none of those terms yields no candidates rather than a fishing
 * expedition.
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

    // read lazily so a consumer stubbing the global afterwards still wins
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
      throw new MetadataProviderResponseError(
        response.status,
        `Open Library search failed with status ${response.status}`,
      )
    }

    return parseOpenLibrarySearchResponse(await response.json())
  }

  const toCandidates = (
    docs: ReadonlyArray<OpenLibraryDoc>,
    options: {
      readonly isbn?: string
      readonly confirmedProjectGutenberg?: ProjectGutenbergLookup
    } = {},
  ): ReadonlyArray<MetadataCandidate> =>
    docs.map((doc) => ({
      metadata: resolveOpenLibraryDoc(doc, {
        coversBaseUrl,
        isbn: options.isbn,
        matchedProjectGutenbergIdentifier:
          options.confirmedProjectGutenberg?.identifier,
      }),
      id: doc.key,
      url: doc.key !== undefined ? `${baseUrl}${doc.key}` : undefined,
      raw: doc,
    }))

  return {
    id: OPEN_LIBRARY_PROVIDER_ID,
    name: "Open Library",
    search: async (input, context) => {
      const isbn = input.isbn?.trim() || undefined
      const projectGutenberg = projectGutenbergLookupFromInput(input)

      if (isbn !== undefined) {
        const docs = await searchDocs({ isbn }, context)

        if (docs.length > 0) return toCandidates(docs, { isbn })
      }

      if (projectGutenberg !== undefined) {
        const docs = await searchDocs(
          { q: `id_project_gutenberg:${projectGutenberg.id}` },
          context,
        )

        if (docs.length > 0) {
          return toCandidates(docs, {
            confirmedProjectGutenberg: projectGutenberg,
          })
        }
      }

      const terms = searchTerms(input)

      if (terms === undefined) return []

      return toCandidates(await searchDocs(terms, context))
    },
  }
}
