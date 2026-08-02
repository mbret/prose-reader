import type { ResolvedMetadata } from "@prose-reader/archive-reader"
import type { MetadataMatchField, MetadataMatchSignal } from "../types/match.ts"
import type { MetadataIdentifier } from "../types/provider.ts"
import { metadataAuthors } from "../utils/metadataAuthors.ts"
import { toIsbn13 } from "../utils/toIsbn13.ts"
import {
  personNameSimilarity,
  textSimilarity,
  titleSimilarity,
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
  contributors: 0.5,
  series: 0.3,
  published: 0.2,
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

const identifierScheme = (identifier: MetadataIdentifier): string | undefined =>
  stated(identifier.scheme)?.toLowerCase()

const identifierLabel = (identifier: MetadataIdentifier): string =>
  identifier.scheme !== undefined
    ? `${identifier.scheme}:${identifier.value}`
    : identifier.value

/**
 * An unannounced scheme (the OPF `dc:identifier` case) is not a contradiction;
 * a `DOI` and an `ISBN` carrying the same digits are.
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

/** Only an authored scope makes a shared raw value unambiguous identity. */
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
const publishedYearScore = (
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
  query: ResolvedMetadata,
  candidate: ResolvedMetadata,
): ScoredMetadataCandidate => {
  const signals: MetadataMatchSignal[] = []

  const addSignal = (
    field: MetadataMatchField,
    values:
      | {
          score: number
          query: string
          candidate: string
        }
      | undefined,
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

  const queryIsbn = stated(query.isbn)
  const candidateIsbn = stated(candidate.isbn)
  const queryIsbn13 = queryIsbn !== undefined ? toIsbn13(queryIsbn) : undefined
  const candidateIsbn13 =
    candidateIsbn !== undefined ? toIsbn13(candidateIsbn) : undefined

  if (
    queryIsbn !== undefined &&
    candidateIsbn !== undefined &&
    queryIsbn13 !== undefined &&
    candidateIsbn13 !== undefined
  ) {
    addSignal("isbn", {
      score: queryIsbn13 === candidateIsbn13 ? 1 : 0,
      query: queryIsbn,
      candidate: candidateIsbn,
    })
  }

  const queryGtin = stated(query.gtin)
  const candidateGtin = stated(candidate.gtin)

  if (queryGtin !== undefined && candidateGtin !== undefined) {
    addSignal("gtin", {
      score: queryGtin === candidateGtin ? 1 : 0,
      query: queryGtin,
      candidate: candidateGtin,
    })
  }

  const queryIdentifiers = query.identifiers ?? []
  const candidateIdentifiers = candidate.identifiers ?? []
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

  compareStrings("title", query.title, candidate.title, titleSimilarity)
  compareStrings("publisher", query.publisher, candidate.publisher)
  compareStrings(
    "series",
    query.belongsTo?.series?.[0]?.name,
    candidate.belongsTo?.series?.[0]?.name,
  )

  const candidateAuthors = metadataAuthors(candidate)
  const queryAuthors = metadataAuthors(query)

  if (queryAuthors.length > 0 && candidateAuthors.length > 0) {
    addSignal("contributors", {
      score: bestSimilarity(
        queryAuthors,
        candidateAuthors,
        personNameSimilarity,
      ),
      query: queryAuthors.join(", "),
      candidate: candidateAuthors.join(", "),
    })
  }

  const queryYear = query.published?.year
  const candidateYear = candidate.published?.year

  if (queryYear !== undefined && candidateYear !== undefined) {
    addSignal("published", {
      score: publishedYearScore(queryYear, candidateYear),
      query: String(queryYear),
      candidate: String(candidateYear),
    })
  }

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
