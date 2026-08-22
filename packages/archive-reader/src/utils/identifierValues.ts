import type {
  MetadataIdentifier,
  MetadataIdentifierScheme,
} from "../types/resolvedMetadata.ts"
import { booklandIsbn } from "./booklandIsbn.ts"
import { normalizeGtin } from "./normalizeGtin.ts"

/**
 * Whether a scheme can carry an ISBN or a GTIN. The two are one namespace in
 * practice: an ISBN-13 *is* a GTIN-13 in the Bookland range, and ComicInfo has
 * no ISBN field at all — it announces one through `GTIN`, which stays labelled
 * `GTIN` because that is what the source said. Filtering on `ISBN` alone
 * therefore misses every comic ISBN, and filtering on `GTIN` alone misses
 * every EPUB one.
 *
 * Schemes are canonicalized while metadata is resolved, so only the canonical
 * spellings are compared.
 */
export const isIsbnBearingScheme = (
  scheme: MetadataIdentifierScheme,
): boolean => scheme === "ISBN" || scheme === "GTIN"

const firstNormalizedValue = (
  identifiers: ReadonlyArray<MetadataIdentifier> | undefined,
  normalize: (value: string) => string | undefined,
): string | undefined => {
  for (const identifier of identifiers ?? []) {
    if (!isIsbnBearingScheme(identifier.scheme)) continue

    const normalized = normalize(identifier.value)

    if (normalized !== undefined) return normalized
  }

  return undefined
}

/**
 * The publication's ISBN, in canonical 10- or 13-character form — the first
 * identifier whose scheme can carry one and whose value really is one. Use
 * this rather than filtering on `scheme === "ISBN"`: ComicInfo announces ISBNs
 * through its broader `GTIN` field, so that filter silently misses them.
 *
 * A value the scheme claims is an ISBN but which is some other barcode (a
 * retail EAN scanned off a comic's cover) is not reported as one, whichever
 * scheme announced it — the identifier itself is still preserved verbatim in
 * `identifiers`, so nothing is lost by the derivation declining to answer.
 */
export const isbnIdentifierValue = (
  identifiers: ReadonlyArray<MetadataIdentifier> | undefined,
): string | undefined => firstNormalizedValue(identifiers, booklandIsbn)

/**
 * The publication's GTIN, digits only — the first identifier whose scheme can
 * carry one and whose value is a GS1-sized number. An ISBN-13 announced as an
 * `ISBN` is a valid GTIN-13 and is reported as one.
 */
export const gtinIdentifierValue = (
  identifiers: ReadonlyArray<MetadataIdentifier> | undefined,
): string | undefined => firstNormalizedValue(identifiers, normalizeGtin)
