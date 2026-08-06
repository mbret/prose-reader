import {
  type MetadataIdentifier,
  normalizeGtin,
  normalizeIsbn,
} from "@prose-reader/archive-reader"

const hasScheme = (
  identifier: MetadataIdentifier,
  schemes: ReadonlySet<string>,
): boolean => schemes.has(identifier.scheme.trim().toLowerCase())

const firstNormalizedValue = (
  identifiers: ReadonlyArray<MetadataIdentifier> | undefined,
  schemes: ReadonlySet<string>,
  normalize: (value: string) => string | undefined,
): string | undefined => {
  for (const identifier of identifiers ?? []) {
    if (!hasScheme(identifier, schemes)) continue

    const normalized = normalize(identifier.value)

    if (normalized !== undefined) return normalized
  }

  return undefined
}

const ISBN_SCHEMES: ReadonlySet<string> = new Set(["isbn", "gtin"])
const GTIN_SCHEMES: ReadonlySet<string> = new Set(["gtin", "isbn"])

const normalizeIdentifierIsbn = (value: string): string | undefined => {
  const isbn = normalizeIsbn(value)

  return isbn !== undefined && (isbn.length === 10 || /^97[89]/.test(isbn))
    ? isbn
    : undefined
}

/** ISBNs may arrive through ComicInfo's broader GTIN field. */
export const isbnIdentifierValue = (
  identifiers: ReadonlyArray<MetadataIdentifier> | undefined,
): string | undefined =>
  firstNormalizedValue(identifiers, ISBN_SCHEMES, normalizeIdentifierIsbn)

/** ISBN-13 is also a GTIN-13, so both announced schemes are accepted. */
export const gtinIdentifierValue = (
  identifiers: ReadonlyArray<MetadataIdentifier> | undefined,
): string | undefined =>
  firstNormalizedValue(identifiers, GTIN_SCHEMES, normalizeGtin)
