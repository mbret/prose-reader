/**
 * Cross-format hints for manifest-style consumers (identifiers, reading order,
 * fixed-layout). Only keys with a defined value are set.
 *
 * @see https://en.wikipedia.org/wiki/ISBN
 */
export type ArchiveResolveResult = {
  /** Digits-only GTIN when the source matches a GS1 length (8 / 12 / 13 / 14). */
  gtin?: string
  isbn?: string
  readingDirection?: "ltr" | "rtl"
  renditionLayout?: "reflowable" | "pre-paginated"
}
