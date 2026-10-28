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

/**
 * A URN, per RFC 8141: `urn:`, a namespace identifier of 2 to 32 letters,
 * digits and inner hyphens, and a namespace-specific string.
 */
const URN_PATTERN = /^urn:([a-z0-9][a-z0-9-]{0,30}[a-z0-9]):\S+$/i

/** A UUID's text form, per RFC 9562: 32 hex digits grouped 8-4-4-4-12. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The scheme a URN's namespace identifier names. */
const urnScheme = (namespaceIdentifier: string): InferredIdentifierScheme => {
  switch (namespaceIdentifier.toLowerCase()) {
    case "isbn":
      return "ISBN"
    case "uuid":
      return "UUID"
    default:
      return "URN"
  }
}

/**
 * The scheme a value announces by its own syntax, for an identifier that
 * announced none: an absolute http(s) link is a `URL`; a URN is the scheme its
 * namespace names — `ISBN` for `urn:isbn:`, `UUID` for `urn:uuid:`, `URN` for
 * any other; a bare UUID is a `UUID`; a Bookland number is an `ISBN`, another
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

  const urnNamespaceIdentifier = URN_PATTERN.exec(trimmed)?.[1]

  if (urnNamespaceIdentifier !== undefined) {
    return urnScheme(urnNamespaceIdentifier)
  }

  if (UUID_PATTERN.test(trimmed)) return "UUID"
  if (booklandIsbn(trimmed) !== undefined) return "ISBN"
  if (normalizeGtin(trimmed) !== undefined) return "GTIN"

  return "Unknown"
}
