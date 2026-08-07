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

type TitleDivision = "volume" | "part" | "book"
const TITLE_DIVISIONS: ReadonlyArray<TitleDivision> = ["volume", "part", "book"]

const TITLE_DIVISION_PATTERN =
  /\b(volumes?|vols?|parts?|books?)\s+([\p{L}\p{N}]+)\b/gu

const TITLE_NUMBER_WORDS: Readonly<Record<string, number>> = {
  one: 1,
  first: 1,
  two: 2,
  second: 2,
  three: 3,
  third: 3,
  four: 4,
  fourth: 4,
  five: 5,
  fifth: 5,
  six: 6,
  sixth: 6,
  seven: 7,
  seventh: 7,
  eight: 8,
  eighth: 8,
  nine: 9,
  ninth: 9,
  ten: 10,
  tenth: 10,
  eleven: 11,
  eleventh: 11,
  twelve: 12,
  twelfth: 12,
}

const ROMAN_DIGIT_VALUES: Readonly<Record<string, number>> = {
  i: 1,
  v: 5,
  x: 10,
  l: 50,
  c: 100,
  d: 500,
  m: 1000,
}

const parseRomanNumeral = (value: string): number | undefined => {
  if (!/^m{0,3}(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/i.test(value))
    return undefined

  let total = 0
  let previous = 0

  for (const symbol of [...value.toLowerCase()].reverse()) {
    const current = ROMAN_DIGIT_VALUES[symbol]

    if (current === undefined) return undefined

    if (current < previous) total -= current
    else {
      total += current
      previous = current
    }
  }

  return total > 0 ? total : undefined
}

const parseTitleDivisionNumber = (value: string): number | undefined => {
  if (/^\d+$/.test(value)) return Number.parseInt(value, 10)

  return TITLE_NUMBER_WORDS[value] ?? parseRomanNumeral(value)
}

const titleDivision = (value: string): TitleDivision | undefined => {
  if (value.startsWith("vol")) return "volume"
  if (value.startsWith("part")) return "part"
  if (value.startsWith("book")) return "book"

  return undefined
}

const explicitTitleDivisions = (
  value: string,
): ReadonlyMap<TitleDivision, ReadonlySet<number>> => {
  const divisions = new Map<TitleDivision, Set<number>>()

  for (const match of normalizeForComparison(value).matchAll(
    TITLE_DIVISION_PATTERN,
  )) {
    const division =
      match[1] !== undefined ? titleDivision(match[1]) : undefined
    const number =
      match[2] !== undefined ? parseTitleDivisionNumber(match[2]) : undefined

    if (division === undefined || number === undefined) continue

    const numbers = divisions.get(division) ?? new Set<number>()
    numbers.add(number)
    divisions.set(division, numbers)
  }

  return divisions
}

const titleDivisionsContradict = (a: string, b: string): boolean => {
  const left = explicitTitleDivisions(a)
  const right = explicitTitleDivisions(b)

  for (const division of TITLE_DIVISIONS) {
    const leftNumbers = left.get(division)
    const rightNumbers = right.get(division)

    if (leftNumbers === undefined || rightNumbers === undefined) continue
    if ([...leftNumbers].every((number) => !rightNumbers.has(number)))
      return true
  }

  return false
}

/**
 * Every volume, part or book number a title states explicitly, whichever
 * division word introduced it — a catalog states the same fact as a series
 * `position`, where the division word is implicit.
 */
export const titleDivisionNumbers = (value: string): ReadonlySet<number> => {
  const numbers = new Set<number>()

  for (const division of explicitTitleDivisions(value).values()) {
    for (const number of division) numbers.add(number)
  }

  return numbers
}

/**
 * {@link textSimilarity}, with `Dune` matched against `Dune: a novel`.
 *
 * Only when **one** side states a subtitle: that asymmetry is the same title
 * catalogued at a different depth. When both state one, both catalogers meant
 * it — `Dune: Book One` and `Dune: Messiah` are two books.
 * Explicit volume, part, or book numbers are semantic identity: when both
 * sides state different ones, the title score is `0` however similar the rest.
 */
export const titleSimilarity = (a: string, b: string): number => {
  if (titleDivisionsContradict(a, b)) return 0

  const full = textSimilarity(a, b)
  const left = splitTitle(a)
  const right = splitTitle(b)

  if (left.hasSubtitle === right.hasSubtitle) return full

  return Math.max(
    full,
    textSimilarity(left.main, right.main) * SUBTITLE_REPAIR_CEILING,
  )
}

/**
 * The best {@link titleSimilarity} over the forms one candidate title takes —
 * bare, or composed with its subtitle.
 *
 * A contradiction in **any** form still scores `0`: `Irina` agreeing with
 * `Irina: … Vol. 2` is not evidence that the candidate's own `Vol. 1` does.
 * Taking the plain maximum would let the shorter form launder a stated
 * disagreement about which volume this is.
 */
export const bestTitleSimilarity = (
  query: string,
  forms: ReadonlyArray<string>,
): { readonly score: number; readonly candidate: string } | undefined => {
  let best: { score: number; candidate: string } | undefined

  for (const form of forms) {
    if (titleDivisionsContradict(query, form))
      return { score: 0, candidate: form }

    const score = titleSimilarity(query, form)

    if (best === undefined || score > best.score)
      best = { score, candidate: form }
  }

  return best
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
