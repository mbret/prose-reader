import type { FetchMetadataInput } from "../../types/fetchMetadataInput.ts"
import type {
  MetadataCandidate,
  MetadataProvider,
  MetadataProviderContext,
} from "../../types/provider.ts"
import { isbnIdentifierValue } from "../../utils/identifierValues.ts"
import { isJsonRecord, readRecordArray } from "../../utils/json.ts"
import { retryWithBackoff } from "../../utils/retryWithBackoff.ts"
import {
  MetadataProviderResponseError,
  responseErrorStatus,
} from "../responseError.ts"
import { googleBooksLookupFromInput } from "./identifier.ts"
import { type GoogleBooksVolume, parseGoogleBooksVolume } from "./parse.ts"
import {
  googleBooksVolumeUrl,
  type ResolveGoogleBooksVolumeOptions,
  resolveGoogleBooksVolume,
} from "./resolve.ts"

const GOOGLE_BOOKS_MAX_RESULTS = 40
const GOOGLE_BOOKS_REQUEST_ATTEMPTS = 3
const GOOGLE_BOOKS_INITIAL_RETRY_DELAY_MS = 1_000
const GOOGLE_BOOKS_MAX_RETRY_DELAY_MS = 3_000
const GOOGLE_BOOKS_RETRYABLE_STATUSES = new Set([500, 502, 503, 504])

type GoogleBooksSearchOptions = {
  readonly apiKey: string
  readonly baseUrl: string
  readonly fetch: typeof globalThis.fetch
}

type GoogleBooksVolumeRecord = {
  readonly volume: GoogleBooksVolume
  readonly raw: unknown
}

const quotedTerm = (value: string): string =>
  `"${value
    .replace(/["\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()}"`

const titleSearchTerms = (
  input: FetchMetadataInput,
): { readonly title: string; readonly author?: string } | undefined => {
  const title = input.title?.trim()

  if (title === undefined || title.length === 0) return undefined

  const author = input.authors?.find((value) => value.trim().length > 0)?.trim()

  return {
    title,
    ...(author !== undefined ? { author } : {}),
  }
}

const parseVolumeRecord = (
  payload: unknown,
): GoogleBooksVolumeRecord | undefined => {
  const volume = parseGoogleBooksVolume(payload)

  return volume !== undefined ? { volume, raw: payload } : undefined
}

const parseVolumeRecords = (
  payload: unknown,
): ReadonlyArray<GoogleBooksVolumeRecord> => {
  if (!isJsonRecord(payload)) return []

  return readRecordArray(payload, "items").flatMap((raw) => {
    const record = parseVolumeRecord(raw)

    return record !== undefined ? [record] : []
  })
}

const toCandidates = (
  records: ReadonlyArray<GoogleBooksVolumeRecord>,
  resolveOptions: ResolveGoogleBooksVolumeOptions = {},
): ReadonlyArray<MetadataCandidate> =>
  records.map(({ volume, raw }) => ({
    metadata: resolveGoogleBooksVolume(volume, resolveOptions),
    id: volume.id,
    url: googleBooksVolumeUrl(volume),
    raw,
  }))

/**
 * Creates the Google Books lookup pipeline. Lookup order is an exact volume
 * identifier, ISBN, then title plus first author with a title-only fallback.
 */
export const createGoogleBooksSearch = (
  options: GoogleBooksSearchOptions,
): MetadataProvider["search"] => {
  const volumesUrl = `${options.baseUrl.replace(/\/+$/, "")}/volumes`

  const request = async (
    url: URL,
    context: MetadataProviderContext,
    notFoundIsEmpty = false,
  ): Promise<Response | undefined> => {
    url.searchParams.set("key", options.apiKey)

    return retryWithBackoff(
      async () => {
        const response = await options.fetch(url.toString(), {
          signal: context.signal,
          headers: { Accept: "application/json" },
        })

        if (notFoundIsEmpty && response.status === 404) return undefined

        if (!response.ok) {
          throw new MetadataProviderResponseError(
            response.status,
            `Google Books lookup failed with status ${response.status}`,
          )
        }

        return response
      },
      {
        attempts: GOOGLE_BOOKS_REQUEST_ATTEMPTS,
        initialDelayMs: GOOGLE_BOOKS_INITIAL_RETRY_DELAY_MS,
        maxDelayMs: GOOGLE_BOOKS_MAX_RETRY_DELAY_MS,
        signal: context.signal,
        shouldRetry: (error) => {
          const status = responseErrorStatus(error)

          return (
            status === undefined || GOOGLE_BOOKS_RETRYABLE_STATUSES.has(status)
          )
        },
      },
    )
  }

  const findByVolumeId = async (
    id: string,
    context: MetadataProviderContext,
  ): Promise<GoogleBooksVolumeRecord | undefined> => {
    const response = await request(
      new URL(`${volumesUrl}/${encodeURIComponent(id)}`),
      context,
      true,
    )

    if (response === undefined) return undefined

    const record = parseVolumeRecord(await response.json())

    if (record?.volume.id !== id) {
      throw new Error(
        `Google Books response did not contain the requested volume ${id}`,
      )
    }

    return record
  }

  const searchVolumes = async (
    query: string,
    context: MetadataProviderContext,
  ): Promise<ReadonlyArray<GoogleBooksVolumeRecord>> => {
    if (context.limit <= 0) return []

    const url = new URL(volumesUrl)

    url.searchParams.set("q", query)
    url.searchParams.set(
      "maxResults",
      String(Math.min(Math.ceil(context.limit), GOOGLE_BOOKS_MAX_RESULTS)),
    )
    url.searchParams.set("orderBy", "relevance")
    url.searchParams.set("printType", "books")

    const response = await request(url, context)

    return response !== undefined
      ? parseVolumeRecords(await response.json())
      : []
  }

  return async (input, context) => {
    const googleBooks = googleBooksLookupFromInput(input)

    if (googleBooks !== undefined) {
      const record = await findByVolumeId(googleBooks.id, context)

      if (record !== undefined) {
        return toCandidates([record], {
          matchedIdentifier: googleBooks.identifier,
        })
      }
    }

    const isbn = isbnIdentifierValue(input.identifiers)

    if (isbn !== undefined) {
      const volumes = await searchVolumes(`isbn:${isbn}`, context)

      if (volumes.length > 0) {
        return toCandidates(volumes, { matchedIsbn: isbn })
      }
    }

    const terms = titleSearchTerms(input)

    if (terms === undefined) return []

    const titleQuery = `intitle:${quotedTerm(terms.title)}`
    const preciseQuery =
      terms.author !== undefined
        ? `${titleQuery} inauthor:${quotedTerm(terms.author)}`
        : titleQuery
    const volumes = await searchVolumes(preciseQuery, context)

    if (volumes.length > 0 || terms.author === undefined) {
      return toCandidates(volumes)
    }

    return toCandidates(await searchVolumes(titleQuery, context))
  }
}
