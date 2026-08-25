import type {
  MetadataIdentifier,
  MetadataIdentifierScheme,
} from "../types/resolvedMetadata.ts"
import { booklandIsbn } from "./booklandIsbn.ts"
import {
  catalogRule,
  isUntypedReferenceScheme,
  type MetadataCatalogScheme,
} from "./catalogIdentifiers.ts"
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

/**
 * Schemes a publication's value can be derived for. Narrower than
 * {@link MetadataIdentifierScheme}: a scheme is here only when knowing it lets
 * us both recognize the identifiers that carry it and canonicalize what they
 * authored. `URL` and `Unknown` describe how a value was stated rather than
 * what assigned it, so there is nothing to derive for them.
 */
export type DerivableIdentifierScheme =
  | Extract<MetadataIdentifierScheme, "ISBN" | "GTIN">
  | MetadataCatalogScheme

type DerivationRule = {
  /** Whether an identifier of this scheme can carry the derived value. */
  readonly carries: (scheme: MetadataIdentifierScheme) => boolean
  readonly normalizeValue: (value: string) => string | undefined
  /** Reads the value out of an untyped reference URL, for catalogs that have one. */
  readonly valueFromUrl?: (value: string) => string | undefined
}

const isbnBearingRule = (
  normalizeValue: (value: string) => string | undefined,
): DerivationRule => ({ carries: isIsbnBearingScheme, normalizeValue })

const catalogDerivationRule = (
  scheme: MetadataCatalogScheme,
): DerivationRule => ({
  carries: (candidate) =>
    candidate.trim().toLowerCase() === scheme.toLowerCase(),
  ...catalogRule(scheme),
})

const DERIVATION_RULES: Record<DerivableIdentifierScheme, DerivationRule> = {
  ISBN: isbnBearingRule(booklandIsbn),
  GTIN: isbnBearingRule(normalizeGtin),
  GoogleBooks: catalogDerivationRule("GoogleBooks"),
  OpenLibrary: catalogDerivationRule("OpenLibrary"),
  ProjectGutenberg: catalogDerivationRule("ProjectGutenberg"),
  DOI: catalogDerivationRule("DOI"),
}

/**
 * The publication's value for one scheme, canonicalized — the first identifier
 * that can carry it and whose value really is one. Use this rather than
 * filtering `identifiers` yourself: which identifiers can answer for a scheme
 * is rarely just the ones labelled with it.
 *
 * - `ISBN` and `GTIN` read each other, because they are one namespace: an
 *   ISBN-13 is a GTIN-13 in the Bookland range, and a comic announces its
 *   ISBN through ComicInfo's `GTIN` field. A value the scheme claims is an
 *   ISBN but which is some other barcode — a retail EAN scanned off a cover —
 *   is not reported as one.
 * - A catalog scheme also reads an untyped reference URL it addresses, since a
 *   comic can only state one as a `Web` link. An identifier another catalog
 *   already claims is left alone.
 *
 * A derivation that declines to answer loses nothing: the identifier itself
 * stays in `identifiers` exactly as authored.
 */
export const identifierValue = (
  identifiers: ReadonlyArray<MetadataIdentifier> | undefined,
  scheme: DerivableIdentifierScheme,
): string | undefined => {
  const rule = DERIVATION_RULES[scheme]

  for (const identifier of identifiers ?? []) {
    if (rule.carries(identifier.scheme)) {
      /**
       * A publication that states the scheme may still write the value as the
       * catalog's own resolver URL, so both spellings answer once the scheme
       * says which catalog assigned it.
       */
      const value =
        rule.normalizeValue(identifier.value) ??
        rule.valueFromUrl?.(identifier.value)

      if (value !== undefined) return value

      continue
    }

    /**
     * Untyped identifiers only answer through a URL: a bare opaque string is
     * never reinterpreted as some catalog's id just because it could be one.
     */
    if (rule.valueFromUrl === undefined) continue
    if (!isUntypedReferenceScheme(identifier.scheme)) continue

    const value = rule.valueFromUrl(identifier.value)

    if (value !== undefined) return value
  }

  return undefined
}
