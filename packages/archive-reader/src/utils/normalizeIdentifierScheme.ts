import type {
  KnownMetadataIdentifierScheme,
  MetadataIdentifierScheme,
} from "../types/resolvedMetadata.ts"

/**
 * Keyed by the scheme union so a scheme added to the vocabulary fails to
 * compile until it is spelled here too.
 */
const CANONICAL_SPELLINGS: Record<
  Lowercase<KnownMetadataIdentifierScheme>,
  KnownMetadataIdentifierScheme
> = {
  isbn: "ISBN",
  gtin: "GTIN",
  doi: "DOI",
  googlebooks: "GoogleBooks",
  openlibrary: "OpenLibrary",
  projectgutenberg: "ProjectGutenberg",
  url: "URL",
  unknown: "Unknown",
}

const SPELLINGS_BY_LOWERCASE = new Map<string, KnownMetadataIdentifierScheme>(
  Object.entries(CANONICAL_SPELLINGS),
)

/**
 * A scheme in the spelling the vocabulary uses, so `opf:scheme="isbn"` and an
 * `identifier-type` of `ISBN` describe the one namespace. Publications author
 * these by hand and their case is not significant.
 *
 * A scheme outside the vocabulary is returned trimmed but otherwise untouched:
 * a custom namespace is a supported case, and its spelling is the
 * publication's to choose.
 */
export const normalizeIdentifierScheme = (
  scheme: MetadataIdentifierScheme,
): MetadataIdentifierScheme => {
  const trimmed = scheme.trim()

  return SPELLINGS_BY_LOWERCASE.get(trimmed.toLowerCase()) ?? trimmed
}
