import type {
  MetadataIdentifier,
  MetadataIdentifierScheme,
} from "../types/resolvedMetadata.ts"
import { booklandIsbn } from "./booklandIsbn.ts"
import {
  catalogRule,
  isReferenceScheme,
  type MetadataCatalogScheme,
} from "./catalogIdentifiers.ts"
import { normalizeGtin } from "./normalizeGtin.ts"
import { normalizeIdentifierScheme } from "./normalizeIdentifierScheme.ts"
import { canonicalUuid, uuidFromUrn } from "./uuid.ts"

/**
 * Whether a scheme can carry an ISBN or a GTIN. The two are one namespace in
 * practice: an ISBN-13 *is* a GTIN-13 in the Bookland range, and ComicInfo has
 * no ISBN field at all — it announces one through `GTIN`, which stays labelled
 * `GTIN` because that is what the source said. Filtering on `ISBN` alone
 * therefore misses every comic ISBN, and filtering on `GTIN` alone misses
 * every EPUB one.
 *
 * Resolving metadata canonicalizes spellings, but this also answers for a
 * scheme a caller assembled by hand.
 */
export const isIsbnBearingScheme = (
  scheme: MetadataIdentifierScheme,
): boolean => {
  const normalized = normalizeIdentifierScheme(scheme)

  return normalized === "ISBN" || normalized === "GTIN"
}

/**
 * Schemes a publication's value can be derived for. Narrower than
 * {@link MetadataIdentifierScheme}: a scheme is here only when knowing it lets
 * us both recognize the identifiers that carry it and canonicalize what they
 * authored. `URL`, `URN` and `Unknown` describe how a value was stated rather
 * than what assigned it, so there is nothing to derive for them.
 */
export type DerivableIdentifierScheme =
  | Extract<MetadataIdentifierScheme, "ISBN" | "GTIN" | "UUID">
  | MetadataCatalogScheme

type DerivationRule = {
  /** Whether an identifier of this scheme can carry the derived value. */
  readonly carries: (scheme: MetadataIdentifierScheme) => boolean
  readonly normalizeValue: (value: string) => string | undefined
  /**
   * Reads the value out of the reference an identifier can state it as — a
   * catalog's URL, a UUID's `urn:uuid:` — for the schemes that have one.
   */
  readonly valueFromReference?: (value: string) => string | undefined
}

const isbnBearingRule = (
  normalizeValue: (value: string) => string | undefined,
): DerivationRule => ({ carries: isIsbnBearingScheme, normalizeValue })

const catalogDerivationRule = (
  scheme: MetadataCatalogScheme,
): DerivationRule => {
  const catalog = catalogRule(scheme)

  return {
    carries: (candidate) => normalizeIdentifierScheme(candidate) === scheme,
    normalizeValue: catalog.normalizeValue,
    valueFromReference: catalog.valueFromUrl,
  }
}

const DERIVATION_RULES: Record<DerivableIdentifierScheme, DerivationRule> = {
  ISBN: isbnBearingRule(booklandIsbn),
  GTIN: isbnBearingRule(normalizeGtin),
  GoogleBooks: catalogDerivationRule("GoogleBooks"),
  OpenLibrary: catalogDerivationRule("OpenLibrary"),
  ProjectGutenberg: catalogDerivationRule("ProjectGutenberg"),
  DOI: catalogDerivationRule("DOI"),
  UUID: {
    carries: (scheme) => normalizeIdentifierScheme(scheme) === "UUID",
    normalizeValue: (value) => canonicalUuid(value) ?? uuidFromUrn(value),
    valueFromReference: uuidFromUrn,
  },
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
 * - `UUID` reads a UUID written bare or as a `urn:uuid:` URN, in either case,
 *   and answers in the lower case RFC 9562 writes it in. A `URN` or untyped
 *   identifier answers only as a `urn:uuid:`, the way an untyped URL answers
 *   for a catalog.
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
        rule.valueFromReference?.(identifier.value)

      if (value !== undefined) return value

      continue
    }

    /**
     * An identifier of a reference scheme only answers through the reference
     * itself, a URL or a URN: a bare opaque string is never reinterpreted as
     * some catalog's id, or a UUID, just because it could be one.
     */
    if (rule.valueFromReference === undefined) continue
    if (!isReferenceScheme(identifier.scheme)) continue

    const value = rule.valueFromReference(identifier.value)

    if (value !== undefined) return value
  }

  return undefined
}
