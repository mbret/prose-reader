import type {
  MetadataIdentifier,
  MetadataIdentifierScheme,
} from "../types/resolvedMetadata.ts"

/**
 * Schemes whose catalog addresses a record by URL, so a publication can state
 * the same identifier either explicitly or as a reference link.
 */
export type MetadataCatalogScheme = Extract<
  MetadataIdentifierScheme,
  "GoogleBooks" | "OpenLibrary" | "ProjectGutenberg" | "DOI"
>

/**
 * Schemes that say nothing about what assigned the value, which is what makes
 * a reference URL worth reading: the publication stated a link, not a
 * namespace. An explicitly typed identifier of another catalog is left alone.
 */
const isUntypedReferenceScheme = (
  scheme: MetadataIdentifierScheme,
): boolean => {
  const normalized = scheme.trim().toLowerCase()

  return (
    normalized === "url" || normalized === "uri" || normalized === "unknown"
  )
}

/**
 * `new URL` accepts a malformed percent escape that `decodeURIComponent`
 * rejects, and these helpers read authored metadata — a book carrying
 * `https://doi.org/10.1000/%` must decline, not throw.
 */
const decodePercentEncoding = (value: string): string | undefined => {
  try {
    return decodeURIComponent(value)
  } catch {
    return undefined
  }
}

const httpUrl = (value: string): URL | undefined => {
  try {
    const url = new URL(value.trim())

    return url.protocol === "http:" || url.protocol === "https:"
      ? url
      : undefined
  } catch {
    return undefined
  }
}

const urlOnHost = (
  value: string,
  matchesHost: (hostname: string) => boolean,
): URL | undefined => {
  const url = httpUrl(value)

  return url !== undefined && matchesHost(url.hostname.toLowerCase())
    ? url
    : undefined
}

const GOOGLE_BOOKS_SITE_HOST =
  /^books\.google\.(?:com|[a-z]{2}|com\.[a-z]{2}|co\.[a-z]{2})$/i
const GOOGLE_BOOKS_API_HOSTS = new Set([
  "books.googleapis.com",
  "www.googleapis.com",
])
const GOOGLE_BOOKS_API_PATH = /^\/books\/v1\/volumes\/([^/]+)\/?$/i

const googleBooksId = (value: string): string | undefined => {
  const trimmed = value.trim()

  return /^[a-z0-9_-]+$/i.test(trimmed) ? trimmed : undefined
}

const googleBooksIdFromUrl = (value: string): string | undefined => {
  const url = urlOnHost(
    value,
    (hostname) =>
      GOOGLE_BOOKS_SITE_HOST.test(hostname) ||
      GOOGLE_BOOKS_API_HOSTS.has(hostname),
  )

  if (url === undefined) return undefined

  if (GOOGLE_BOOKS_API_HOSTS.has(url.hostname.toLowerCase())) {
    const id = GOOGLE_BOOKS_API_PATH.exec(url.pathname)?.[1]
    const decoded = id === undefined ? undefined : decodePercentEncoding(id)

    return decoded === undefined ? undefined : googleBooksId(decoded)
  }

  return googleBooksId(url.searchParams.get("id") ?? "")
}

const GUTENBERG_HOSTS = new Set(["gutenberg.org", "www.gutenberg.org"])
const GUTENBERG_PATHS: ReadonlyArray<RegExp> = [
  /^\/ebooks\/(\d+)(?:[./]|$)/i,
  /^\/files\/(\d+)(?:\/|$)/i,
  /^\/cache\/epub\/(\d+)(?:\/|$)/i,
  /^\/(\d+)(?:\/|$)/,
]

const projectGutenbergId = (value: string): string | undefined => {
  const trimmed = value.trim()

  if (!/^\d+$/.test(trimmed)) return undefined

  const withoutLeadingZeros = trimmed.replace(/^0+(?=\d)/, "")

  return withoutLeadingZeros === "0" ? undefined : withoutLeadingZeros
}

const projectGutenbergIdFromUrl = (value: string): string | undefined => {
  const url = urlOnHost(value, (hostname) => GUTENBERG_HOSTS.has(hostname))

  if (url === undefined) return undefined

  for (const pattern of GUTENBERG_PATHS) {
    const id = pattern.exec(url.pathname)?.[1]

    if (id !== undefined) return projectGutenbergId(id)
  }

  return undefined
}

const OPEN_LIBRARY_HOSTS = new Set(["openlibrary.org", "www.openlibrary.org"])
const OPEN_LIBRARY_KEY = /^\/(works|books|authors)\/(OL\d+[A-Z])(?:\/|$)/i
const OPEN_LIBRARY_BARE_ID = /^OL\d+([MWA])$/i

const OPEN_LIBRARY_COLLECTIONS: Record<string, string> = {
  M: "books",
  W: "works",
  A: "authors",
}

/**
 * Open Library addresses a record by its key path, which is the value this
 * scheme carries. A bare id is accepted too, since its suffix letter says
 * which collection it belongs to.
 */
const openLibraryKey = (value: string): string | undefined => {
  const trimmed = value.trim()
  const key = OPEN_LIBRARY_KEY.exec(trimmed)

  if (key?.[1] !== undefined && key[2] !== undefined) {
    return `/${key[1].toLowerCase()}/${key[2].toUpperCase()}`
  }

  const bare = OPEN_LIBRARY_BARE_ID.exec(trimmed)
  const collection = OPEN_LIBRARY_COLLECTIONS[bare?.[1]?.toUpperCase() ?? ""]

  return collection === undefined
    ? undefined
    : `/${collection}/${trimmed.toUpperCase()}`
}

const openLibraryKeyFromUrl = (value: string): string | undefined => {
  const url = urlOnHost(value, (hostname) => OPEN_LIBRARY_HOSTS.has(hostname))

  return url === undefined ? undefined : openLibraryKey(url.pathname)
}

const DOI_HOSTS = new Set(["doi.org", "dx.doi.org", "www.doi.org"])
const DOI_NAME = /^10\.\d{4,9}\/\S+$/

const doiName = (value: string): string | undefined => {
  const trimmed = value.trim().replace(/^doi:/i, "")

  return DOI_NAME.test(trimmed) ? trimmed : undefined
}

const doiNameFromUrl = (value: string): string | undefined => {
  const url = urlOnHost(value, (hostname) => DOI_HOSTS.has(hostname))
  const decoded =
    url === undefined
      ? undefined
      : decodePercentEncoding(url.pathname.replace(/^\//, ""))

  return decoded === undefined ? undefined : doiName(decoded)
}

type Catalog = {
  readonly scheme: MetadataCatalogScheme
  readonly normalizeValue: (value: string) => string | undefined
  readonly valueFromUrl: (value: string) => string | undefined
  /** Builds the catalog's own URL for an already-normalized value. */
  readonly toUrl: (value: string) => string
}

const CATALOGS: ReadonlyArray<Catalog> = [
  {
    scheme: "GoogleBooks",
    normalizeValue: googleBooksId,
    valueFromUrl: googleBooksIdFromUrl,
    toUrl: (value) =>
      `https://books.google.com/books?id=${encodeURIComponent(value)}`,
  },
  {
    scheme: "ProjectGutenberg",
    normalizeValue: projectGutenbergId,
    valueFromUrl: projectGutenbergIdFromUrl,
    toUrl: (value) => `https://www.gutenberg.org/ebooks/${value}`,
  },
  {
    scheme: "OpenLibrary",
    normalizeValue: openLibraryKey,
    valueFromUrl: openLibraryKeyFromUrl,
    toUrl: (value) => `https://openlibrary.org${value}`,
  },
  {
    scheme: "DOI",
    normalizeValue: doiName,
    valueFromUrl: doiNameFromUrl,
    toUrl: (value) => `https://doi.org/${value}`,
  },
]

/**
 * Every scheme whose catalog addresses a record by URL, so a publication can
 * state the identifier either explicitly or as a reference link.
 */
export const METADATA_CATALOG_SCHEMES: ReadonlyArray<MetadataCatalogScheme> =
  CATALOGS.map(function toScheme(catalog) {
    return catalog.scheme
  })

const catalogFor = (scheme: MetadataIdentifierScheme): Catalog | undefined => {
  const schemeKey = scheme.trim().toLowerCase()

  return CATALOGS.find(function matchesScheme(catalog) {
    return catalog.scheme.toLowerCase() === schemeKey
  })
}

/** Whether a scheme's catalog addresses its records by URL. */
export const isMetadataCatalogScheme = (
  scheme: MetadataIdentifierScheme,
): boolean => catalogFor(scheme) !== undefined

/**
 * The catalog identifier a reference URL stands for, or `undefined` when no
 * known catalog addresses that URL.
 *
 * This derives — it does not reinterpret. Resolved metadata keeps the authored
 * URL as a `URL` identifier whatever this returns, so a publication that
 * stated a link still reports a link; deciding to treat that link as the
 * publication's catalog identifier is the caller's call.
 */
export const catalogIdentifierFromUrl = (
  url: string,
): MetadataIdentifier | undefined => {
  for (const catalog of CATALOGS) {
    const value = catalog.valueFromUrl(url)

    if (value !== undefined) return { value, scheme: catalog.scheme }
  }

  return undefined
}

/**
 * The catalog's own URL for an identifier — the inverse of
 * {@link catalogIdentifierFromUrl}, for writing a reference into a container
 * whose only identifier slot is a list of links.
 *
 * `undefined` when the scheme has no catalog, or when the value is not one
 * that catalog can address. The pair is checked rather than assumed: a URL is
 * only returned once reading it back yields the value it was built from, so
 * the two directions cannot drift apart unnoticed.
 */
export const catalogUrlFromIdentifier = ({
  scheme,
  value,
}: MetadataIdentifier): string | undefined => {
  const catalog = catalogFor(scheme)
  const normalized = catalog?.normalizeValue(value)

  if (catalog === undefined || normalized === undefined) return undefined

  const url = catalog.toUrl(normalized)

  return catalog.valueFromUrl(url) === normalized ? url : undefined
}

/**
 * How one catalog recognizes its own identifiers, for the derivation table in
 * `identifierValues.ts` to read.
 */
export const catalogRule = (
  scheme: MetadataCatalogScheme,
): Pick<Catalog, "normalizeValue" | "valueFromUrl"> => {
  const catalog = CATALOGS.find(function matchesScheme(candidate) {
    return candidate.scheme === scheme
  })

  if (catalog === undefined) {
    throw new Error(`No catalog rule for scheme ${scheme}`)
  }

  return catalog
}

export { isUntypedReferenceScheme }
