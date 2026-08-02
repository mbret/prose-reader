import type { FetchMetadataInput } from "../../types/fetchMetadataInput.ts"
import type {
  MetadataProvider,
  MetadataProviderContext,
} from "../../types/provider.ts"
import { MetadataProviderResponseError } from "../responseError.ts"
import { projectGutenbergLookupFromInput } from "./identifier.ts"
import { parseProjectGutenbergRdf } from "./parse.ts"
import { resolveProjectGutenbergRecord } from "./resolve.ts"

export const PROJECT_GUTENBERG_PROVIDER_ID = "projectGutenberg"

const DEFAULT_BASE_URL = "https://www.gutenberg.org"

export type ProjectGutenbergProviderOptions = {
  /** Catalog origin. Defaults to `https://www.gutenberg.org`. */
  readonly baseUrl?: string
  /** For tests, a custom agent, or a caching layer. Defaults to the global one. */
  readonly fetch?: typeof globalThis.fetch
  /** Optional identifying user agent sent with the RDF request. */
  readonly userAgent?: string
}

/**
 * Project Gutenberg's official catalog, queried through its per-eBook RDF
 * records. The provider performs exact identifier lookups only: official
 * Gutenberg URLs and numeric `ProjectGutenberg` identifiers are accepted;
 * titles are deliberately never used to crawl or fuzzily search the site.
 */
export const createProjectGutenbergProvider = (
  options: ProjectGutenbergProviderOptions = {},
): MetadataProvider => {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL

  const search = async (
    input: FetchMetadataInput,
    context: MetadataProviderContext,
  ) => {
    const lookup = projectGutenbergLookupFromInput(input)

    if (lookup === undefined) return []

    const recordUrl = new URL(
      `/cache/epub/${lookup.id}/pg${lookup.id}.rdf`,
      baseUrl,
    )
    const doFetch = options.fetch ?? globalThis.fetch
    const response = await doFetch(recordUrl.toString(), {
      signal: context.signal,
      headers: {
        Accept: "application/rdf+xml, application/xml;q=0.9",
        ...(options.userAgent !== undefined
          ? { "User-Agent": options.userAgent }
          : {}),
      },
    })

    if (response.status === 404) return []

    if (!response.ok) {
      throw new MetadataProviderResponseError(
        response.status,
        `Project Gutenberg metadata lookup failed with status ${response.status}`,
      )
    }

    const record = parseProjectGutenbergRdf(await response.text())

    if (record === undefined || record.id !== lookup.id) {
      throw new Error(
        `Project Gutenberg RDF did not contain the requested eBook ${lookup.id}`,
      )
    }

    const bookUrl = new URL(`/ebooks/${lookup.id}`, baseUrl).toString()

    return [
      {
        id: record.id,
        url: bookUrl,
        raw: record,
        metadata: resolveProjectGutenbergRecord(record, {
          baseUrl,
          matchedIdentifier: lookup.identifier,
        }),
      },
    ]
  }

  return {
    id: PROJECT_GUTENBERG_PROVIDER_ID,
    name: "Project Gutenberg",
    search,
  }
}
