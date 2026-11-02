import type { KnownMetadataIdentifierScheme } from "../types/resolvedMetadata.ts"
import { booklandIsbn } from "./booklandIsbn.ts"
import { normalizeGtin } from "./normalizeGtin.ts"
import { parseUrn } from "./urn.ts"
import { canonicalUuid } from "./uuid.ts"

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
 * The scheme a value written as a URN announces. The namespace it names
 * counts only when the rest is that namespace's value — an ISBN after
 * `urn:isbn:`, a UUID after `urn:uuid:` — and any other well-formed URN is a
 * `URN`. One that is not well-formed is `Unknown`: it still never reaches the
 * barcode readings, which would take the digit runs of a malformed
 * `urn:uuid:{…}` for an ISBN-10 or a GTIN.
 */
const urnScheme = (value: string): InferredIdentifierScheme => {
  const urn = parseUrn(value)

  if (urn === undefined) return "Unknown"

  switch (urn.namespaceIdentifier) {
    case "isbn":
      return booklandIsbn(urn.namespaceSpecificString) !== undefined
        ? "ISBN"
        : "URN"
    case "uuid":
      return canonicalUuid(urn.namespaceSpecificString) !== undefined
        ? "UUID"
        : "URN"
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

  if (canonicalUuid(trimmed) !== undefined) return "UUID"
  if (booklandIsbn(trimmed) !== undefined) return "ISBN"
  if (normalizeGtin(trimmed) !== undefined) return "GTIN"

  return "Unknown"
}
