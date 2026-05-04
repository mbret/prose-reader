const GTIN_LENGTHS = new Set([8, 12, 13, 14])

/**
 * Normalize a raw GTIN / EAN / UPC string to digits only when the length
 * matches a GS1 GTIN family size (8, 12, 13, or 14). Does not verify check digits.
 */
export const normalizeGtin = (
  raw: string | number | undefined | null,
): string | undefined => {
  if (raw === undefined || raw === null) return undefined

  const digits = String(raw).replace(/\D/g, "")
  if (digits.length === 0 || !GTIN_LENGTHS.has(digits.length)) return undefined

  return digits
}
