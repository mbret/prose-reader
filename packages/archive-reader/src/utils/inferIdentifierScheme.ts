import type { KnownMetadataIdentifierScheme } from "../types/resolvedMetadata.ts"
import { booklandIsbn } from "./booklandIsbn.ts"
import { normalizeGtin } from "./normalizeGtin.ts"

/**
 * The schemes a value can announce by itself. Drawn from
 * {@link KnownMetadataIdentifierScheme} rather than restated, so renaming one
 * there fails to compile here.
 */
export type InferredIdentifierScheme = Extract<
  KnownMetadataIdentifierScheme,
  "ISBN" | "GTIN" | "UUID" | "URN" | "URL" | "Unknown"
>

/** One URI path character, per RFC 3986: what a URN's parts are made of. */
const URI_PATH_CHARACTER = "(?:[a-z0-9._~!$&'()*+,;=:@-]|%[0-9a-f]{2})"

/**
 * A URN, per RFC 8141: `urn:`, a namespace identifier of 2 to 32 letters,
 * digits and inner hyphens, a namespace-specific string of URI path
 * characters, and the optional `?+`, `?=` and `#` components.
 */
const URN_PATTERN = new RegExp(
  `^urn:([a-z0-9][a-z0-9-]{0,30}[a-z0-9])` +
    `:(${URI_PATH_CHARACTER}(?:${URI_PATH_CHARACTER}|/)*)` +
    `(?:\\?\\+${URI_PATH_CHARACTER}(?:${URI_PATH_CHARACTER}|[/?])*)?` +
    `(?:\\?=${URI_PATH_CHARACTER}(?:${URI_PATH_CHARACTER}|[/?])*)?` +
    `(?:#(?:${URI_PATH_CHARACTER}|[/?])*)?$`,
  "i",
)

/** A UUID's text form, per RFC 9562: 32 hex digits grouped 8-4-4-4-12. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The scheme a value written as a URN announces. The namespace it names
 * counts only when the rest is that namespace's value — an ISBN after
 * `urn:isbn:`, a UUID after `urn:uuid:` — and any other well-formed URN is a
 * `URN`. One that is not well-formed is `Unknown`: it still never reaches the
 * barcode readings, which would take the digit runs of a malformed
 * `urn:uuid:{…}` for an ISBN-10 or a GTIN.
 */
const urnScheme = (urn: string): InferredIdentifierScheme => {
  const [, namespaceIdentifier, namespaceSpecificString] =
    URN_PATTERN.exec(urn) ?? []

  if (
    namespaceIdentifier === undefined ||
    namespaceSpecificString === undefined
  ) {
    return "Unknown"
  }

  switch (namespaceIdentifier.toLowerCase()) {
    case "isbn":
      return booklandIsbn(namespaceSpecificString) !== undefined
        ? "ISBN"
        : "URN"
    case "uuid":
      return UUID_PATTERN.test(namespaceSpecificString) ? "UUID" : "URN"
    default:
      return "URN"
  }
}

/**
 * The scheme a value announces by its own syntax, for an identifier that
 * announced none: an absolute http(s) link is a `URL`; a URN is the scheme its
 * namespace names when it holds that namespace's value — `ISBN` for an ISBN
 * after `urn:isbn:`, `UUID` for a UUID after `urn:uuid:` — and a `URN`
 * otherwise; a bare UUID is a `UUID`; a Bookland number is an `ISBN`, another
 * well-formed barcode a `GTIN`, and anything else is `Unknown`.
 *
 * EPUB 3.3 recommends a URN for its unique identifier because the namespace it
 * states "improves processing by reading systems", and the URN and the UUID
 * are read before the barcodes: their digit runs can pass for an ISBN-10 or a
 * GTIN, and would otherwise lend a book an ISBN it never had.
 *
 * This is what resolution believes about an untyped identifier, so a consumer
 * holding the container itself — one editing it in place — reads it from here
 * rather than restating it, and cannot disagree with `identifiers` about which
 * element carries which scheme.
 */
export const inferIdentifierScheme = (
  value: string,
): InferredIdentifierScheme => {
  const trimmed = value.trim()

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed)

      if (
        (url.protocol === "http:" || url.protocol === "https:") &&
        url.hostname.length > 0
      ) {
        return "URL"
      }
    } catch {
      // Continue with identifier-specific inference.
    }
  }

  if (/^urn:/i.test(trimmed)) return urnScheme(trimmed)

  if (UUID_PATTERN.test(trimmed)) return "UUID"
  if (booklandIsbn(trimmed) !== undefined) return "ISBN"
  if (normalizeGtin(trimmed) !== undefined) return "GTIN"

  return "Unknown"
}
