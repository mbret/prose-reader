const ISBN_CANDIDATE_PATTERN = /(?:97[89])?\d{9}[\dXx]/

/**
 * Normalize a raw ISBN-ish string into a canonical 10- or 13-character
 * form, or `undefined` when no recognisable ISBN can be recovered.
 *
 *  - Strips the common `urn:isbn:` / `isbn:` prefixes.
 *  - Drops everything that isn't a digit or `X`.
 *  - Validates the resulting length (10 or 13).
 *  - Falls back to a lax regex scan so publishers that stuff free text
 *    around the number still yield a usable value.
 */
export const normalizeIsbn = (
  raw: string | number | undefined | null,
): string | undefined => {
  if (raw === undefined || raw === null) return undefined

  const stripped = String(raw)
    .trim()
    .replace(/^urn:isbn:/i, "")
    .replace(/^isbn[:\s-]*/i, "")

  const digitsOnly = stripped.replace(/[^0-9Xx]/g, "")

  if (digitsOnly.length === 10 || digitsOnly.length === 13) {
    return digitsOnly.toUpperCase()
  }

  const match = stripped.match(ISBN_CANDIDATE_PATTERN)
  if (match) return match[0].toUpperCase()

  return undefined
}
