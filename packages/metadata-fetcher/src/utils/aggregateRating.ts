import type { ResolvedAggregateRating } from "@prose-reader/archive-reader"
import { omitUndefined } from "./omitUndefined.ts"

const MAX_VALUE = 5

/**
 * Builds the cross-format aggregate rating from a catalog's mean and count.
 * Both Google Books and Open Library state the mean on a 1–5 star scale, which
 * is the scale {@link ResolvedAggregateRating} promises, so neither needs
 * rescaling — a source on another scale divides before calling this.
 *
 * A mean outside 0–5, a count that isn't a non-negative integer, and a mean
 * announced over zero ratings are all dropped: a catalog contradicting itself
 * would otherwise render as a real star count.
 */
export const resolvedAggregateRating = (
  mean: number | undefined,
  count: number | undefined,
): ResolvedAggregateRating | undefined => {
  if (mean === undefined || mean < 0 || mean > MAX_VALUE) return undefined

  const ratings =
    count !== undefined && Number.isInteger(count) && count >= 0
      ? count
      : undefined

  if (ratings === 0) return undefined

  return omitUndefined({ value: mean, count: ratings })
}
