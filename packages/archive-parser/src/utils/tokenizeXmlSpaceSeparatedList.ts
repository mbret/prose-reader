/**
 * EPUB/XML space-separated token lists (e.g. `properties` on `item` / `itemref`).
 * Trims the raw string, splits on ASCII whitespace, drops empty segments.
 */
export const tokenizeXmlSpaceSeparatedList = (
  raw: string | undefined,
): readonly string[] => {
  if (raw === undefined || raw.trim().length === 0) {
    return []
  }

  return raw
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0)
}
