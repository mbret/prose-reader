const DIACRITICS = /[\u0300-\u036f]/g
const NON_ALPHANUMERIC = /[^\p{L}\p{N}]+/gu

/**
 * Fold a human string down to what two catalogs can be expected to agree on:
 * diacritics removed ("Les Misérables" ≡ "Les Miserables"), case folded, and
 * every run of punctuation/symbols turned into a single space (`Dune:
 * Messiah` ≡ `Dune - Messiah`).
 */
export const normalizeForComparison = (value: string): string =>
  value
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(NON_ALPHANUMERIC, " ")
    .trim()

const bigramCounts = (value: string): Map<string, number> => {
  const counts = new Map<string, number>()

  for (let index = 0; index < value.length - 1; index++) {
    const bigram = value.slice(index, index + 2)

    counts.set(bigram, (counts.get(bigram) ?? 0) + 1)
  }

  return counts
}

/**
 * Sørensen–Dice coefficient over the character bigrams of both normalized,
 * space-stripped strings: `1` for equal strings, `0` for nothing in common.
 *
 * Bigrams rather than an edit distance because titles disagree by whole words
 * far more often than by typos ("The Hobbit" vs "The Hobbit, or There and
 * Back Again"), and spaces are stripped so a differently-tokenized but
 * identical title ("Spider-Man" vs "Spider Man") stays exact.
 */
export const textSimilarity = (a: string, b: string): number => {
  const left = normalizeForComparison(a).replaceAll(" ", "")
  const right = normalizeForComparison(b).replaceAll(" ", "")

  if (left.length === 0 || right.length === 0) return 0
  if (left === right) return 1
  // a single character has no bigram to compare, and it isn't equal
  if (left.length < 2 || right.length < 2) return 0

  const leftBigrams = bigramCounts(left)
  let shared = 0

  for (const [bigram, count] of bigramCounts(right)) {
    shared += Math.min(count, leftBigrams.get(bigram) ?? 0)
  }

  return (2 * shared) / (left.length - 1 + (right.length - 1))
}

/** The standard subtitle separators, spaced dashes only so `Spider-Man` is one word. */
const SUBTITLE_SEPARATOR = /\s*[:;]\s*|\s+[-–—]\s+/

const splitTitle = (value: string): { main: string; hasSubtitle: boolean } => {
  const [head = "", ...rest] = value.split(SUBTITLE_SEPARATOR)
  const main = head.trim()
  const subtitle = rest.join(" ").trim()

  if (main.length === 0) return { main: value, hasSubtitle: false }

  return { main, hasSubtitle: subtitle.length > 0 }
}

/**
 * A repaired match stays below an exact one: the part one side omitted could
 * have been a distinguishing volume title rather than a subtitle.
 */
const SUBTITLE_REPAIR_CEILING = 0.9

/**
 * {@link textSimilarity} with the subtitle asymmetry repaired: a book whose
 * package document says `Dune` and a catalog record saying `Dune: a novel`
 * are the same book, but bigrams read the extra half as a different title.
 *
 * The repair only applies when **one** side states a subtitle and the other
 * doesn't — that asymmetry is what "the same title, catalogued at a different
 * depth" looks like. When both state one, both catalogers meant it and the
 * subtitles are compared for real: `Dune: Book One` and `Dune: Messiah` are
 * two books, not one.
 */
export const titleSimilarity = (a: string, b: string): number => {
  const full = textSimilarity(a, b)
  const left = splitTitle(a)
  const right = splitTitle(b)

  if (left.hasSubtitle === right.hasSubtitle) return full

  return Math.max(
    full,
    textSimilarity(left.main, right.main) * SUBTITLE_REPAIR_CEILING,
  )
}

const sortedTokens = (value: string): string =>
  normalizeForComparison(value)
    .split(" ")
    .filter((token) => token.length > 0)
    .sort()
    .join(" ")

/**
 * {@link textSimilarity} on token-sorted names: people are authored both ways
 * in the wild — "Herbert, Frank" in an OPF `file-as`, "Frank Herbert" in a
 * catalog record — and the two are the same person, not a 0.4 match.
 */
export const personNameSimilarity = (a: string, b: string): number =>
  textSimilarity(sortedTokens(a), sortedTokens(b))
