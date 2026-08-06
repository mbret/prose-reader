/** Scheme used by `ResolvedMetadata.identifiers` for a Google Books volume. */
export const GOOGLE_BOOKS_IDENTIFIER_SCHEME = "GoogleBooks"

/** An identifier a metadata provider can use for lookup or matching. */
export type MetadataIdentifier = {
  /** Identifier exactly as announced by the source. */
  readonly value: string
  /** Namespace, such as `DOI`, `URL`, `ProjectGutenberg` or `GoogleBooks`. */
  readonly scheme?: string
}

/**
 * The compact description of a publication that metadata providers understand
 * for lookup and matching. Rich catalog-only values belong on returned
 * candidates, not on this operation-specific input.
 */
export type FetchMetadataInput = {
  /** Human-readable title of the work or edition. */
  readonly title?: string
  /** Author names, lead author first. */
  readonly authors?: ReadonlyArray<string>
  readonly isbn?: string
  readonly gtin?: string
  /** Google Books volume id, such as `zyTCAlFPjgYC`. */
  readonly googleBooksId?: string
  readonly identifiers?: ReadonlyArray<MetadataIdentifier>
  /** Series name, when it helps identify or disambiguate the publication. */
  readonly series?: string
  /** Publisher evidence without an original-versus-edition distinction. */
  readonly publisher?: string
  /** Publication-year evidence without an original-versus-edition distinction. */
  readonly publishedYear?: number
  /** BCP 47 language tags. */
  readonly languages?: ReadonlyArray<string>
  readonly numberOfPages?: number
}
