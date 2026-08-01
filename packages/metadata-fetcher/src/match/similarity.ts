const DIACRITICS = /[\u0300-\u036f]/g
const NON_ALPHANUMERIC = /[^\p{L}\p{N}]+/gu

/** `Les Misérables` ≡ `les miserables`, `Dune: Messiah` ≡ `dune messiah`. */
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
 * Sørensen–Dice coefficient over character bigrams, `0` to `1`.
 *
 * Bigrams rather than an edit distance: titles disagree by whole words far
 * more often than by typos. Spaces are stripped so `Spider-Man` and
 * `Spider Man` stay exact.
 */
export const textSimilarity = (a: string, b: string): number => {
  const left = normalizeForComparison(a).replaceAll(" ", "")
  const right = normalizeForComparison(b).replaceAll(" ", "")

  if (left.length === 0 || right.length === 0) return 0
  if (left === right) return 1
  // nothing to compare: a single character has no bigram
  if (left.length < 2 || right.length < 2) return 0

  const leftBigrams = bigramCounts(left)
  let shared = 0

  for (const [bigram, count] of bigramCounts(right)) {
    shared += Math.min(count, leftBigrams.get(bigram) ?? 0)
  }

  return (2 * shared) / (left.length - 1 + (right.length - 1))
}

/** Spaced dashes only, so `Spider-Man` stays one word. */
const SUBTITLE_SEPARATOR = /\s*[:;]\s*|\s+[-–—]\s+/

const splitTitle = (value: string): { main: string; hasSubtitle: boolean } => {
  const [head = "", ...rest] = value.split(SUBTITLE_SEPARATOR)
  const main = head.trim()
  const subtitle = rest.join(" ").trim()

  if (main.length === 0) return { main: value, hasSubtitle: false }

  return { main, hasSubtitle: subtitle.length > 0 }
}

/** Below an exact match: the omitted half could have been a volume title. */
const SUBTITLE_REPAIR_CEILING = 0.9

/**
 * {@link textSimilarity}, with `Dune` matched against `Dune: a novel`.
 *
 * Only when **one** side states a subtitle: that asymmetry is the same title
 * catalogued at a different depth. When both state one, both catalogers meant
 * it — `Dune: Book One` and `Dune: Messiah` are two books.
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

/** {@link textSimilarity} on sorted tokens: `Herbert, Frank` ≡ `Frank Herbert`. */
export const personNameSimilarity = (a: string, b: string): number =>
  textSimilarity(sortedTokens(a), sortedTokens(b))
