import {
  type MetadataIdentifier,
  mainTitle,
  type ResolvedMetadata,
} from "@prose-reader/archive-reader"
import type { FetchMetadataInput } from "../types/fetchMetadataInput.ts"
import type { MetadataMatchField, MetadataMatchSignal } from "../types/match.ts"
import {
  gtinIdentifierValue,
  isbnIdentifierValue,
} from "../utils/identifierValues.ts"
import { metadataAuthors } from "../utils/metadataAuthors.ts"
import { toIsbn13 } from "../utils/toIsbn13.ts"
import {
  bestTitleSimilarity,
  personNameSimilarity,
  textSimilarity,
  titleDivisionNumbers,
} from "./similarity.ts"

/**
 * Intent, not statistics: identifiers *are* the book, a title is what a human
 * recognizes it by, everything else corroborates. An edition detail that
 * differs must never sink an otherwise convincing match on its own.
 */
export const METADATA_MATCH_WEIGHTS = {
  isbn: 1,
  gtin: 1,
  identifiers: 0.6,
  title: 0.8,
  authors: 0.5,
  series: 0.3,
  publishedYear: 0.2,
  publisher: 0.15,
  languages: 0.15,
  numberOfPages: 0.15,
} as const satisfies Record<MetadataMatchField, number>

/**
 * Identity rather than description, so these settle the score outright in both
 * directions. Catalogs and books disagree on titles and page counts
 * constantly; they do not agree or disagree on an ISBN by accident.
 */
const DECISIVE_FIELDS: ReadonlySet<MetadataMatchField> = new Set([
  "isbn",
  "gtin",
])

/** Blank is absent — the vocabulary says so, a hand-built query may not. */
const stated = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim()

  return trimmed !== undefined && trimmed.length > 0 ? trimmed : undefined
}

const identifiersHaveSameValue = (
  a: MetadataIdentifier,
  b: MetadataIdentifier,
): boolean => {
  const aValue = stated(a.value)?.toLowerCase()

  return aValue !== undefined && aValue === stated(b.value)?.toLowerCase()
}

const identifierScheme = (
  identifier: MetadataIdentifier,
): string | undefined =>
  identifier.scheme.trim().toLowerCase() === "unknown"
    ? undefined
    : stated(identifier.scheme)?.toLowerCase()

const identifierLabel = (identifier: MetadataIdentifier): string =>
  `${identifier.scheme}:${identifier.value}`

const isIsbnOrGtinIdentifier = (identifier: MetadataIdentifier): boolean => {
  const scheme = identifier.scheme.trim().toLowerCase()

  return scheme === "isbn" || scheme === "gtin"
}

/**
 * An `Unknown` scheme is not a contradiction; a `DOI` and an `ISBN` carrying
 * the same digits are.
 */
const identifiersAgree = (
  a: MetadataIdentifier,
  b: MetadataIdentifier,
): boolean => {
  if (!identifiersHaveSameValue(a, b)) return false
  const aScheme = identifierScheme(a)
  const bScheme = identifierScheme(b)

  if (aScheme === undefined || bScheme === undefined) return true

  return aScheme === bScheme
}

/** Only a known or consumer-authored scope makes a value unambiguous identity. */
const identifiersAgreeDecisively = (
  a: MetadataIdentifier,
  b: MetadataIdentifier,
): boolean => {
  if (!identifiersHaveSameValue(a, b)) return false
  const aScheme = identifierScheme(a)
  const bScheme = identifierScheme(b)

  return aScheme !== undefined && aScheme === bScheme
}

const primaryLanguageSubtag = (language: string): string =>
  language.trim().toLowerCase().split("-")[0] ?? ""

/** Reprints shift the year around, so a near one still corroborates. */
const publicationYearScore = (
  queryYear: number,
  candidateYear: number,
): number => {
  const distance = Math.abs(queryYear - candidateYear)

  if (distance === 0) return 1
  if (distance === 1) return 0.6
  if (distance <= 3) return 0.3

  return 0
}

/**
 * Proximity, not equality — front matter and ads move the count: identical is
 * `1`, 25% apart `0.5`, half as long `0`.
 */
const numberOfPagesScore = (query: number, candidate: number): number => {
  const largest = Math.max(query, candidate)

  if (largest <= 0) return 0

  return Math.max(0, 1 - (Math.abs(query - candidate) / largest) * 2)
}

const bestSimilarity = (
  values: ReadonlyArray<string>,
  candidates: ReadonlyArray<string>,
  compare: (a: string, b: string) => number,
): number =>
  values.reduce(
    (best, value) =>
      candidates.reduce(
        (innerBest, candidate) =>
          Math.max(innerBest, compare(value, candidate)),
        best,
      ),
    0,
  )

type ComparedValues = {
  readonly score: number
  readonly query: string
  readonly candidate: string
}

const bestStringComparison = (
  rawQueryValue: string | undefined,
  rawCandidateValues: ReadonlyArray<string | undefined>,
  compare: (a: string, b: string) => number = textSimilarity,
): ComparedValues | undefined => {
  const query = stated(rawQueryValue)

  if (query === undefined) return undefined

  let best: ComparedValues | undefined

  for (const rawCandidate of rawCandidateValues) {
    const candidate = stated(rawCandidate)

    if (candidate === undefined) continue

    const comparison = { score: compare(query, candidate), query, candidate }

    if (best === undefined || comparison.score > best.score) best = comparison
  }

  return best
}

/**
 * A comparison string, not a value: a book states `Dune: A Novel` in one
 * `dc:title` where a catalog states a title and a subtitle, and the query
 * side has whichever spelling its source used. Composing the two for the
 * comparison alone keeps that asymmetry from costing score, while the
 * candidate's own metadata stays exactly as the catalog stated it.
 */
const subtitledTitle = (candidate: ResolvedMetadata): string | undefined => {
  const main = mainTitle(candidate)
  const subtitle = candidate.titles?.find(
    (title) => title.type === "subtitle",
  )?.value

  return main !== undefined && subtitle !== undefined
    ? `${main}: ${subtitle}`
    : undefined
}

/**
 * A book says `BLAME! Vol. 2` in its title where a catalog says `BLAME!` with
 * a series `position` of 2 — the same fact in two shapes. Comparing the
 * shapes against each other keeps a numbered query from accepting the wrong
 * volume of the right series, which the title comparison alone cannot see
 * once the number lives in structured data instead of the title string.
 */
const seriesPositionContradicts = (
  queryTitle: string,
  candidate: ResolvedMetadata,
): boolean => {
  const queryNumbers = titleDivisionNumbers(queryTitle)

  if (queryNumbers.size === 0) return false

  const positions = (candidate.belongsTo?.series ?? []).flatMap((series) =>
    series.position !== undefined ? [series.position] : [],
  )

  return (
    positions.length > 0 &&
    positions.every((position) => !queryNumbers.has(position))
  )
}

const bestPublicationYearComparison = (
  query: number | undefined,
  candidates: ReadonlyArray<number | undefined>,
): ComparedValues | undefined => {
  if (query === undefined) return undefined

  let best: ComparedValues | undefined

  for (const candidate of candidates) {
    if (candidate === undefined) continue

    const comparison = {
      score: publicationYearScore(query, candidate),
      query: String(query),
      candidate: String(candidate),
    }

    if (best === undefined || comparison.score > best.score) best = comparison
  }

  return best
}

export type ScoredMetadataCandidate = {
  readonly score: number
  readonly signals: ReadonlyArray<MetadataMatchSignal>
}

/**
 * How well a candidate agrees with the query, field by field, and why. Every
 * provider is scored by these rules, so their scores stay comparable:
 *
 * - **Only comparable fields count** — a field is compared when both sides
 *   state it, so what the book doesn't know can neither raise nor lower a
 *   candidate, and nothing in common scores `0`.
 * - **The aggregate is a weighted average** ({@link METADATA_MATCH_WEIGHTS}),
 *   putting a rich query and a sparse one on the same scale.
 * - **Confirmed identity settles it** — an agreeing ISBN, GTIN, or
 *   scheme-scoped identifier pins the score to `1`. A contradictory ISBN or
 *   GTIN pins it to `0`; two disjoint provider-specific identifier lists are
 *   merely unrelated.
 */
export const scoreMetadataCandidate = (
  query: FetchMetadataInput,
  candidate: ResolvedMetadata,
): ScoredMetadataCandidate => {
  const signals: MetadataMatchSignal[] = []

  const addSignal = (
    field: MetadataMatchField,
    values: ComparedValues | undefined,
  ) => {
    if (values === undefined) return

    signals.push({
      field,
      weight: METADATA_MATCH_WEIGHTS[field],
      score: Math.min(1, Math.max(0, values.score)),
      query: values.query,
      candidate: values.candidate,
    })
  }

  const compareStrings = (
    field: MetadataMatchField,
    rawQueryValue: string | undefined,
    rawCandidateValue: string | undefined,
    compare: (a: string, b: string) => number = textSimilarity,
  ) => {
    const queryValue = stated(rawQueryValue)
    const candidateValue = stated(rawCandidateValue)

    if (queryValue === undefined || candidateValue === undefined) return

    addSignal(field, {
      score: compare(queryValue, candidateValue),
      query: queryValue,
      candidate: candidateValue,
    })
  }

  const queryIsbn = isbnIdentifierValue(query.identifiers)
  const candidateIsbn = isbnIdentifierValue(candidate.identifiers)
  const queryIsbn13 = queryIsbn !== undefined ? toIsbn13(queryIsbn) : undefined
  const candidateIsbn13 =
    candidateIsbn !== undefined ? toIsbn13(candidateIsbn) : undefined

  const comparedIsbn =
    queryIsbn !== undefined &&
    candidateIsbn !== undefined &&
    queryIsbn13 !== undefined &&
    candidateIsbn13 !== undefined

  if (comparedIsbn) {
    addSignal("isbn", {
      score: queryIsbn13 === candidateIsbn13 ? 1 : 0,
      query: queryIsbn,
      candidate: candidateIsbn,
    })
  }

  const queryGtin = gtinIdentifierValue(query.identifiers)
  const candidateGtin = gtinIdentifierValue(candidate.identifiers)

  if (!comparedIsbn && queryGtin !== undefined && candidateGtin !== undefined) {
    addSignal("gtin", {
      score: queryGtin === candidateGtin ? 1 : 0,
      query: queryGtin,
      candidate: candidateGtin,
    })
  }

  // ISBN and GTIN have normalized comparisons above. Comparing their raw
  // spellings again would emit a false generic mismatch for hyphenated ISBNs.
  const queryIdentifiers = (query.identifiers ?? []).filter(
    (identifier) => !isIsbnOrGtinIdentifier(identifier),
  )
  const candidateIdentifiers = (candidate.identifiers ?? []).filter(
    (identifier) => !isIsbnOrGtinIdentifier(identifier),
  )
  const decisiveIdentifierAgreement = queryIdentifiers.some((identifier) =>
    candidateIdentifiers.some((other) =>
      identifiersAgreeDecisively(identifier, other),
    ),
  )

  if (queryIdentifiers.length > 0 && candidateIdentifiers.length > 0) {
    const shared = queryIdentifiers.some((identifier) =>
      candidateIdentifiers.some((other) => identifiersAgree(identifier, other)),
    )

    addSignal("identifiers", {
      score: shared ? 1 : 0,
      query: queryIdentifiers.map(identifierLabel).join(", "),
      candidate: candidateIdentifiers.map(identifierLabel).join(", "),
    })
  }

  const queryTitle = stated(query.title)
  const candidateTitleForms = [
    mainTitle(candidate),
    subtitledTitle(candidate),
  ].flatMap((form) => {
    const value = stated(form)

    return value !== undefined ? [value] : []
  })

  if (queryTitle !== undefined && candidateTitleForms.length > 0) {
    const compared = bestTitleSimilarity(queryTitle, candidateTitleForms)

    if (compared !== undefined) {
      addSignal("title", {
        score: seriesPositionContradicts(queryTitle, candidate)
          ? 0
          : compared.score,
        query: queryTitle,
        candidate: compared.candidate,
      })
    }
  }
  addSignal(
    "publisher",
    bestStringComparison(query.publisher, [
      candidate.publication?.original?.publisher,
      candidate.publication?.edition?.publisher,
    ]),
  )
  compareStrings("series", query.series, candidate.belongsTo?.series?.[0]?.name)

  const candidateAuthors = metadataAuthors(candidate)
  const queryAuthors = (query.authors ?? []).flatMap((author) => {
    const name = stated(author)

    return name !== undefined ? [name] : []
  })

  if (queryAuthors.length > 0 && candidateAuthors.length > 0) {
    addSignal("authors", {
      score: bestSimilarity(
        queryAuthors,
        candidateAuthors,
        personNameSimilarity,
      ),
      query: queryAuthors.join(", "),
      candidate: candidateAuthors.join(", "),
    })
  }

  addSignal(
    "publishedYear",
    bestPublicationYearComparison(query.publishedYear, [
      candidate.publication?.original?.date?.year,
      candidate.publication?.edition?.date?.year,
    ]),
  )

  const queryLanguages = query.languages ?? []
  const candidateLanguages = candidate.languages ?? []

  if (queryLanguages.length > 0 && candidateLanguages.length > 0) {
    const candidateSubtags = new Set(
      candidateLanguages.map(primaryLanguageSubtag),
    )

    addSignal("languages", {
      score: queryLanguages.some((language) =>
        candidateSubtags.has(primaryLanguageSubtag(language)),
      )
        ? 1
        : 0,
      query: queryLanguages.join(", "),
      candidate: candidateLanguages.join(", "),
    })
  }

  if (
    query.numberOfPages !== undefined &&
    candidate.numberOfPages !== undefined
  ) {
    addSignal("numberOfPages", {
      score: numberOfPagesScore(query.numberOfPages, candidate.numberOfPages),
      query: String(query.numberOfPages),
      candidate: String(candidate.numberOfPages),
    })
  }

  const decisive = signals.filter((signal) => DECISIVE_FIELDS.has(signal.field))

  // Contradiction wins over agreement: refusing a publication whose stated
  // identity disagrees is the recoverable mistake. Without this the average is
  // merciful to exactly the wrong candidate — a different edition agreeing on
  // title and author scores (0.8 + 0.5) / 2.3 ≈ 0.57, accepted.
  if (decisive.some((signal) => signal.score === 0))
    return { score: 0, signals }
  if (
    decisiveIdentifierAgreement ||
    decisive.some((signal) => signal.score === 1)
  )
    return { score: 1, signals }

  const totalWeight = signals.reduce(
    (total, signal) => total + signal.weight,
    0,
  )

  if (totalWeight === 0) return { score: 0, signals }

  const weighted = signals.reduce(
    (total, signal) => total + signal.score * signal.weight,
    0,
  )

  return { score: weighted / totalWeight, signals }
}
