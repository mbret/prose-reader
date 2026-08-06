import {
  type FetchMetadataInput,
  GOOGLE_BOOKS_IDENTIFIER_SCHEME,
  type MetadataIdentifier,
} from "../../types/fetchMetadataInput.ts"

export { GOOGLE_BOOKS_IDENTIFIER_SCHEME } from "../../types/fetchMetadataInput.ts"

export type GoogleBooksLookup = {
  readonly id: string
  /** The book's exact identifier spelling, echoed only after Google confirms it. */
  readonly identifier: MetadataIdentifier
}

const GOOGLE_BOOKS_API_HOSTS: ReadonlySet<string> = new Set([
  "books.googleapis.com",
  "www.googleapis.com",
])
const GOOGLE_BOOKS_SITE_HOST =
  /^books\.google\.(?:com|[a-z]{2}|com\.[a-z]{2}|co\.[a-z]{2})$/i

const normalizedGoogleBooksId = (value: string): string | undefined => {
  const trimmed = value.trim()

  return /^[a-z0-9_-]+$/i.test(trimmed) ? trimmed : undefined
}

const googleBooksIdFromUrl = (value: string): string | undefined => {
  try {
    const url = new URL(value.trim())

    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined

    const hostname = url.hostname.toLowerCase()

    if (GOOGLE_BOOKS_SITE_HOST.test(hostname)) {
      return normalizedGoogleBooksId(url.searchParams.get("id") ?? "")
    }

    if (GOOGLE_BOOKS_API_HOSTS.has(hostname)) {
      const id = /^\/books\/v1\/volumes\/([^/]+)\/?$/i.exec(url.pathname)?.[1]

      return id !== undefined
        ? normalizedGoogleBooksId(decodeURIComponent(id))
        : undefined
    }
  } catch {
    return undefined
  }

  return undefined
}

/**
 * Recognizes an authored Google Books volume id and the official Google Books
 * website/API URL forms. Arbitrary scheme-less strings are not reinterpreted
 * as ids: callers with a raw id should label it `GoogleBooks`.
 */
export const googleBooksLookupFromInput = (
  input: FetchMetadataInput,
): GoogleBooksLookup | undefined => {
  if (input.googleBooksId !== undefined) {
    const id = normalizedGoogleBooksId(input.googleBooksId)

    if (id !== undefined) {
      return {
        id,
        identifier: {
          value: id,
          scheme: GOOGLE_BOOKS_IDENTIFIER_SCHEME,
        },
      }
    }
  }

  for (const identifier of input.identifiers ?? []) {
    const scheme = identifier.scheme?.trim().toLowerCase()
    const id =
      scheme === GOOGLE_BOOKS_IDENTIFIER_SCHEME.toLowerCase()
        ? normalizedGoogleBooksId(identifier.value)
        : scheme === undefined || scheme === "url" || scheme === "uri"
          ? googleBooksIdFromUrl(identifier.value)
          : undefined

    if (id === undefined) continue

    return {
      id,
      identifier: {
        value: identifier.value,
        ...(identifier.scheme !== undefined
          ? { scheme: identifier.scheme }
          : {}),
      },
    }
  }

  return undefined
}
