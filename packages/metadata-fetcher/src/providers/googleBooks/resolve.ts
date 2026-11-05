import {
  type MetadataIdentifier,
  parseW3cDtfDate,
  type ResolvedCollection,
  type ResolvedContributor,
  type ResolvedCover,
  type ResolvedMetadata,
  type ResolvedTitle,
} from "@prose-reader/archive-reader"
import { resolvedAggregateRating } from "../../utils/aggregateRating.ts"
import { omitUndefined } from "../../utils/omitUndefined.ts"
import { GOOGLE_BOOKS_IDENTIFIER_SCHEME } from "./identifier.ts"
import type {
  GoogleBooksImageLinks,
  GoogleBooksIndustryIdentifier,
  GoogleBooksSeriesInfo,
  GoogleBooksVolume,
} from "./parse.ts"

export const GOOGLE_BOOKS_MAX_SUBJECTS = 25

const emptyToUndefined = <T>(
  values: ReadonlyArray<T>,
): ReadonlyArray<T> | undefined => (values.length > 0 ? values : undefined)

const resolvedIdentifierScheme = (type: string | undefined): string =>
  type === "ISBN_10" || type === "ISBN_13" ? "ISBN" : (type ?? "Unknown")

const dedupeIdentifiers = (
  identifiers: ReadonlyArray<MetadataIdentifier>,
): ReadonlyArray<MetadataIdentifier> | undefined =>
  emptyToUndefined(
    identifiers.filter(
      (identifier, index, all) =>
        all.findIndex(
          (other) =>
            other.value.trim().toLowerCase() ===
              identifier.value.trim().toLowerCase() &&
            other.scheme.trim().toLowerCase() ===
              identifier.scheme.trim().toLowerCase(),
        ) === index,
    ),
  )

const resolvedIndustryIdentifiers = (
  values: ReadonlyArray<GoogleBooksIndustryIdentifier>,
): ReadonlyArray<MetadataIdentifier> =>
  values.map((identifier) =>
    omitUndefined({
      value: identifier.identifier,
      scheme: resolvedIdentifierScheme(identifier.type),
    }),
  )

/**
 * Google states the title and the subtitle as separate fields, so they stay
 * separate: composing them for display is the consumer's decision.
 */
const resolvedTitles = (
  title: string | undefined,
  subtitle: string | undefined,
): ReadonlyArray<ResolvedTitle> | undefined =>
  emptyToUndefined([
    ...(title !== undefined ? [{ value: title }] : []),
    ...(subtitle !== undefined
      ? [{ value: subtitle, type: "subtitle" as const }]
      : []),
  ])

/**
 * The volume's place in its series, which Google identifies by id alone — it
 * never states the series name, and inventing one would be fabrication.
 */
const resolvedSeries = (
  seriesInfo: GoogleBooksSeriesInfo | undefined,
): ReadonlyArray<ResolvedCollection> | undefined =>
  emptyToUndefined(
    (seriesInfo?.volumeSeries ?? []).flatMap<ResolvedCollection>((series) => {
      const entry = omitUndefined({
        identifiers:
          series.seriesId !== undefined
            ? [
                {
                  value: series.seriesId,
                  scheme: GOOGLE_BOOKS_IDENTIFIER_SCHEME,
                },
              ]
            : undefined,
        position: series.orderNumber,
      })

      return Object.keys(entry).length > 0 ? [entry] : []
    }),
  )

const absoluteHttpUrl = (value: string | undefined): URL | undefined => {
  if (value === undefined) return undefined

  try {
    const url = new URL(value)

    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined

    if (url.protocol === "http:") url.protocol = "https:"

    return url
  } catch {
    return undefined
  }
}

const PAGE_CURL_QUERY_PAIR = "edge=curl"

/**
 * Removes the `edge=curl` pair by hand rather than through `searchParams`,
 * which would serialize every other pair again, signed `imgtk` included.
 */
const withoutPageCurl = (url: URL): string => {
  const pairs = url.search.slice(1).split("&")
  const keptPairs = pairs.filter((pair) => pair !== PAGE_CURL_QUERY_PAIR)

  if (keptPairs.length < pairs.length) url.search = keptPairs.join("&")

  return url.toString()
}

/**
 * The largest cover Google links, over HTTPS and without the page curl that
 * `edge=curl` draws on it. Every other parameter is kept as Google wrote it:
 * a different `zoom` can serve the "image not available" picture, or another
 * page of a scanned book, and `imgtk` is signed. Dropping `edge=curl` serves
 * the same image at the same size.
 */
export const googleBooksCoverUrl = (
  imageLinks: GoogleBooksImageLinks | undefined,
): string | undefined => {
  if (imageLinks === undefined) return undefined

  const candidates = [
    imageLinks.extraLarge,
    imageLinks.large,
    imageLinks.medium,
    imageLinks.small,
    imageLinks.thumbnail,
    imageLinks.smallThumbnail,
  ]

  for (const candidate of candidates) {
    const absolute = absoluteHttpUrl(candidate)

    if (absolute !== undefined) return withoutPageCurl(absolute)
  }

  return undefined
}

export const resolveGoogleBooksCover = (
  imageLinks: GoogleBooksImageLinks | undefined,
): ResolvedCover | undefined => {
  const uri = googleBooksCoverUrl(imageLinks)

  return uri !== undefined ? { uri, confidence: "derived" } : undefined
}

const resolvedContributors = (
  authors: ReadonlyArray<string>,
): ReadonlyArray<ResolvedContributor> | undefined =>
  emptyToUndefined(
    authors.map<ResolvedContributor>((name) => ({
      name,
      roles: ["author"],
    })),
  )

export type ResolveGoogleBooksVolumeOptions = {
  /** ISBN query that this response confirmed, even if the payload omits it. */
  readonly matchedIsbn?: string
}

/** Normalizes one Google Books volume into the cross-format vocabulary. */
export const resolveGoogleBooksVolume = (
  volume: GoogleBooksVolume,
  options: ResolveGoogleBooksVolumeOptions = {},
): ResolvedMetadata => {
  const { id, volumeInfo, ...unhandledVolume } = volume
  const {
    title,
    subtitle,
    authors,
    publisher,
    publishedDate,
    description,
    industryIdentifiers,
    pageCount,
    categories,
    averageRating,
    ratingsCount,
    language,
    imageLinks,
    seriesInfo,
    // read by `googleBooksVolumeUrl`, which builds the match's url
    infoLink: _infoLink,
    canonicalVolumeLink: _canonicalVolumeLink,
    ...unhandledVolumeInfo
  } = volumeInfo ?? {}

  // Naming every parsed field is the contract: adding one to the parsed
  // shapes fails here until someone decides what becomes of it.
  unhandledVolume satisfies Record<string, never>
  unhandledVolumeInfo satisfies Record<string, never>

  const sourceIdentifiers = resolvedIndustryIdentifiers(
    industryIdentifiers ?? [],
  )
  const identifiers = dedupeIdentifiers([
    ...(options.matchedIsbn !== undefined
      ? [{ value: options.matchedIsbn, scheme: "ISBN" }]
      : []),
    ...(id !== undefined
      ? [{ value: id, scheme: GOOGLE_BOOKS_IDENTIFIER_SCHEME }]
      : []),
    ...sourceIdentifiers,
  ])
  const edition = omitUndefined({
    date: parseW3cDtfDate(publishedDate),
    publisher,
  })
  const cover = resolveGoogleBooksCover(imageLinks)
  const subjects = [...new Set(categories ?? [])].slice(
    0,
    GOOGLE_BOOKS_MAX_SUBJECTS,
  )

  const series = resolvedSeries(seriesInfo)

  return omitUndefined({
    titles: resolvedTitles(title, subtitle),
    description,
    belongsTo: series !== undefined ? { series } : undefined,
    publication:
      edition.date !== undefined || edition.publisher !== undefined
        ? { edition }
        : undefined,
    languages: language !== undefined ? [language] : undefined,
    subjects: emptyToUndefined(subjects),
    contributors: resolvedContributors(authors ?? []),
    numberOfPages: pageCount,
    aggregateRating: resolvedAggregateRating(averageRating, ratingsCount),
    identifiers,
    cover,
  })
}

/** The human-facing Google Books page for a candidate. */
export const googleBooksVolumeUrl = (
  volume: GoogleBooksVolume,
): string | undefined =>
  (
    absoluteHttpUrl(volume.volumeInfo?.canonicalVolumeLink) ??
    absoluteHttpUrl(volume.volumeInfo?.infoLink)
  )?.toString() ??
  (volume.id !== undefined
    ? `https://books.google.com/books?id=${encodeURIComponent(volume.id)}`
    : undefined)
