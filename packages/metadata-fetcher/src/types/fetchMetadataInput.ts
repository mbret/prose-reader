import type { MetadataIdentifier } from "@prose-reader/archive-reader"

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
  /** Scheme-scoped publication and catalog identifiers. */
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
