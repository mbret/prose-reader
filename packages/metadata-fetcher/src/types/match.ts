import type { ResolvedMetadata } from "@prose-reader/archive-reader"

/**
 * The fields the matcher compares — only ever when **both** sides state one,
 * so what the query doesn't know cannot count against a candidate.
 */
export type MetadataMatchField =
  | "isbn"
  | "gtin"
  | "identifiers"
  | "title"
  | "contributors"
  | "series"
  | "publisher"
  | "published"
  | "languages"
  | "numberOfPages"

/**
 * One field comparison. The compared values sit next to the score so a match
 * is explainable to a user — "same title, different publisher" — without
 * re-deriving anything.
 */
export type MetadataMatchSignal = {
  readonly field: MetadataMatchField
  /** How much the two values agree, `0` (nothing in common) to `1` (equal). */
  readonly score: number
  /** The field's relative importance in the aggregate (see `METADATA_MATCH_WEIGHTS`). */
  readonly weight: number
  /** The local value that was compared, rendered for display. */
  readonly query: string
  /** The candidate value that was compared, rendered for display. */
  readonly candidate: string
}

/**
 * A scored candidate: the metadata a provider found, plus why we believe (or
 * don't) that it is the same book.
 */
export type MetadataMatch = {
  readonly providerId: string
  /**
   * Aggregate confidence, `0` to `1`: the weight-averaged score of every
   * comparable field — except when an ISBN, GTIN or shared scheme-scoped
   * identifier confirms identity, which settles it at `1`. A contradictory
   * ISBN or GTIN settles it at `0`. `0` too when the two sides had no field in
   * common to compare.
   */
  readonly score: number
  readonly signals: ReadonlyArray<MetadataMatchSignal>
  /**
   * Reached `minScore`, and so contributed to the merged
   * `FetchedMetadata.metadata`. Rejected matches are kept and ranked, for a
   * consumer to offer for manual confirmation.
   */
  readonly accepted: boolean
  readonly metadata: ResolvedMetadata
  readonly id?: string
  readonly url?: string
  readonly raw?: unknown
}
