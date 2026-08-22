const NUMBER_PATTERN = /[0-9Xx]+/g
const ISBN_NUMBER_PATTERN = /^(?:97[89])?\d{9}[\dXx]$/

/**
 * Normalize a raw ISBN-ish string into a canonical 10- or 13-character
 * form, or `undefined` when no recognisable ISBN can be recovered.
 *
 *  - Strips the common `urn:isbn:` / `isbn:` prefixes.
 *  - Drops everything that isn't a digit or `X`.
 *  - Validates the resulting length (10 or 13).
 *  - Falls back to scanning the numbers in the string, so publishers that
 *    stuff free text around the ISBN still yield a usable value.
 *
 * Only a *whole* number is a candidate in that fallback: carving ten digits
 * out of a longer barcode (`036180592125` — a GTIN-12) would invent an ISBN
 * the publication never printed.
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

  for (const number of stripped.match(NUMBER_PATTERN) ?? []) {
    if (ISBN_NUMBER_PATTERN.test(number)) return number.toUpperCase()
  }

  return undefined
}
