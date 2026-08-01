import type { ResolvedMetadata } from "@prose-reader/archive-reader"

/**
 * The {@link ResolvedMetadata} fields the matcher compares. A field is only
 * ever compared when **both** sides speak about it: what the query doesn't
 * know cannot count against a candidate.
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
 * One field comparison — the unit of "how it matched". Keeping the compared
 * values next to the score makes a match explainable to a user ("same title,
 * different publisher") without re-deriving anything.
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
  /** Id of the {@link MetadataProvider} this record came from. */
  readonly providerId: string
  /**
   * Aggregate confidence, `0` to `1`: the weight-averaged score of every
   * comparable field, or exactly `1` when an identifier the catalog and the
   * book both state agrees (an ISBN/GTIN match *is* the book). `0` when the
   * two sides had no field in common to compare.
   */
  readonly score: number
  /** Every field comparison behind {@link MetadataMatch.score}. */
  readonly signals: ReadonlyArray<MetadataMatchSignal>
  /**
   * Whether this match reached `minScore` and therefore contributed to the
   * merged `FetchedMetadata.metadata`. Rejected matches are kept, ranked, so a
   * consumer can still offer them for manual confirmation.
   */
  readonly accepted: boolean
  /** The record, normalized into the cross-format vocabulary. */
  readonly metadata: ResolvedMetadata
  /** Provider-native record id, when the provider exposes one. */
  readonly id?: string
  /** Canonical url of the record, for attribution and deep links. */
  readonly url?: string
  /** The provider's own record, present only when `includeRaw` is on. */
  readonly raw?: unknown
}
