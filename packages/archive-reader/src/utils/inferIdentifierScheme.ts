import { booklandIsbn } from "./booklandIsbn.ts"
import { normalizeGtin } from "./normalizeGtin.ts"

/**
 * The scheme a value announces by its own syntax, for an identifier that
 * announced none: an absolute http(s) link is a `URL`, a Bookland number is an
 * `ISBN`, another well-formed barcode is a `GTIN`, and anything else is
 * `Unknown`.
 *
 * This is what resolution believes about an untyped identifier, so a consumer
 * holding the container itself — one editing it in place — reads it from here
 * rather than restating it, and cannot disagree with `identifiers` about which
 * element carries which scheme.
 */
export const inferIdentifierScheme = (value: string): string => {
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

  if (booklandIsbn(trimmed) !== undefined) return "ISBN"
  if (normalizeGtin(trimmed) !== undefined) return "GTIN"

  return "Unknown"
}
