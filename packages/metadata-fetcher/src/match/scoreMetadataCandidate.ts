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
 * Relative importance of each field in the aggregate score. The scale is
 * intent, not statistics: identifiers *are* the book, a title is what a human
 * recognizes it by, and everything else is corroboration — an edition detail
 * that differs (a reprint's year, a regional publisher, a page count off by a
 * front matter) must never sink an otherwise convincing match on its own.
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
 * Fields that identify a publication rather than describe it, so they settle
 * the score outright, in both directions: state the same one and the candidate
 * *is* the book (`1`); state a different one and it is not (`0`), however well
 * the descriptive fields agree. Catalogs and books disagree on titles,
 * editions and page counts constantly — they do not agree or disagree on an
 * ISBN by accident.
 */
const DECISIVE_FIELDS: ReadonlySet<MetadataMatchField> = new Set([
  "isbn",
  "gtin",
])

/** Blank is absent: the vocabulary says so, and a hand-built query may not. */
const stated = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim()

  return trimmed !== undefined && trimmed.length > 0 ? trimmed : undefined
}

const identifierKey = (identifier: MetadataIdentifier): string =>
  identifier.value.trim().toLowerCase()

const identifierLabel = (identifier: MetadataIdentifier): string =>
  identifier.scheme !== undefined
    ? `${identifier.scheme}:${identifier.value}`
    : identifier.value

/**
 * Two identifiers agree when their values do and their schemes don't
 * contradict — an unannounced scheme (the OPF `dc:identifier` case) is not a
 * contradiction, a `DOI` and an `ISBN` carrying the same digits would be.
 */
const identifiersAgree = (
  a: MetadataIdentifier,
  b: MetadataIdentifier,
): boolean => {
  if (identifierKey(a) !== identifierKey(b)) return false
  if (a.scheme === undefined || b.scheme === undefined) return true

  return a.scheme.trim().toLowerCase() === b.scheme.trim().toLowerCase()
}

/** Compare on the primary subtag: `en-US` and `en` are the same language. */
const primaryLanguageSubtag = (language: string): string =>
  language.trim().toLowerCase().split("-")[0] ?? ""

/**
 * Reprints and regional editions shift the publication year around, so a
 * near year still corroborates; a decade apart doesn't.
 */
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
 * Page counts legitimately differ by front matter, ads or a different
 * edition, so this is a proximity score, not equality: identical is `1`, 25%
 * apart is `0.5`, half as long is `0`.
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
 * Scores one candidate against the query: how well the two agree, field by
 * field, and why.
 *
 * The rules, in one place because every provider is scored by them:
 *
 * - **Only comparable fields count.** A field is compared when both sides
 *   state it; what the book doesn't know can neither raise nor lower a
 *   candidate. A candidate with nothing in common to compare scores `0`.
 * - **The aggregate is a weighted average** of the comparable fields (see
 *   {@link METADATA_MATCH_WEIGHTS}), so a rich query and a sparse one both
 *   land on the same `0`–`1` scale.
 * - **A stated identifier settles it, both ways.** An agreeing ISBN or GTIN
 *   pins the score to `1`; a contradicting one pins it to `0`, which is what
 *   sinks the plausible-looking wrong edition that agrees on everything a
 *   weighted average can see.
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

  // Identity settles it, both ways — and contradiction wins over agreement,
  // because refusing a publication whose stated identity disagrees is the
  // recoverable mistake. Without this the average is merciful to exactly the
  // wrong candidate: a different edition agreeing on title and author scores
  // (0.8 + 0.5) / 2.3 ≈ 0.57, i.e. accepted, despite a contradicting ISBN.
  if (decisive.some((signal) => signal.score === 0))
    return { score: 0, signals }
  if (decisive.some((signal) => signal.score === 1))
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
