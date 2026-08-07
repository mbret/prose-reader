import {
  type MetadataIdentifier,
  parseW3cDtfDate,
  type ResolvedContributor,
  type ResolvedCover,
  type ResolvedMetadata,
} from "@prose-reader/archive-reader"
import { omitUndefined } from "../../utils/omitUndefined.ts"
import { GOOGLE_BOOKS_IDENTIFIER_SCHEME } from "./identifier.ts"
import type {
  GoogleBooksImageLinks,
  GoogleBooksIndustryIdentifier,
  GoogleBooksVolume,
  GoogleBooksVolumeInfo,
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

const industryIdentifiers = (
  values: ReadonlyArray<GoogleBooksIndustryIdentifier>,
): ReadonlyArray<MetadataIdentifier> =>
  values.map((identifier) =>
    omitUndefined({
      value: identifier.identifier,
      scheme: resolvedIdentifierScheme(identifier.type),
    }),
  )

const titleWithSeriesNumber = (
  volumeInfo: GoogleBooksVolumeInfo,
): string | undefined => {
  const title =
    volumeInfo.title !== undefined && volumeInfo.subtitle !== undefined
      ? `${volumeInfo.title}: ${volumeInfo.subtitle}`
      : volumeInfo.title
  const displayNumber = volumeInfo.seriesInfo?.bookDisplayNumber
  const hasSeriesNumber =
    title !== undefined &&
    (/\bvol(?:ume)?\.?\s*\S+/i.test(title) ||
      /\b(?:book|part)(?:\s*#\s*|\s+)(?:\d+(?:[.-]\d+)*|[ivxlcdm]+)\b/i.test(
        title,
      ))

  if (title === undefined || displayNumber === undefined || hasSeriesNumber) {
    return title
  }

  return `${title} Vol ${displayNumber}`
}

const absoluteHttpUrl = (value: string | undefined): string | undefined => {
  if (value === undefined) return undefined

  try {
    const url = new URL(value)

    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined

    if (url.protocol === "http:") url.protocol = "https:"

    return url.toString()
  } catch {
    return undefined
  }
}

/**
 * Prefer the largest cover Google announced and force HTTPS. Preserve the
 * query exactly: changing Google's `zoom`, `edge` or signed `imgtk` parameters
 * can turn a valid cover into its "image not available" placeholder.
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

    if (absolute !== undefined) return absolute
  }

  return undefined
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
  /** Exact Google Books identifier that this response confirmed. */
  readonly matchedIdentifier?: MetadataIdentifier
  /** ISBN query that this response confirmed, even if the payload omits it. */
  readonly matchedIsbn?: string
}

/** Normalizes one Google Books volume into the cross-format vocabulary. */
export const resolveGoogleBooksVolume = (
  volume: GoogleBooksVolume,
  options: ResolveGoogleBooksVolumeOptions = {},
): ResolvedMetadata => {
  const volumeInfo = volume.volumeInfo ?? {}
  const sourceIndustryIdentifiers = volumeInfo.industryIdentifiers ?? []
  const sourceIdentifiers = industryIdentifiers(sourceIndustryIdentifiers)
  const identifiers = dedupeIdentifiers([
    ...(options.matchedIdentifier !== undefined
      ? [options.matchedIdentifier]
      : []),
    ...(options.matchedIsbn !== undefined
      ? [{ value: options.matchedIsbn, scheme: "ISBN" }]
      : []),
    ...(volume.id !== undefined
      ? [{ value: volume.id, scheme: GOOGLE_BOOKS_IDENTIFIER_SCHEME }]
      : []),
    ...sourceIdentifiers,
  ])
  const edition = omitUndefined({
    date: parseW3cDtfDate(volumeInfo.publishedDate),
    publisher: volumeInfo.publisher,
  })
  const coverUri = googleBooksCoverUrl(volumeInfo.imageLinks)
  const cover: ResolvedCover | undefined =
    coverUri !== undefined
      ? {
          uri: coverUri,
          confidence: "derived",
        }
      : undefined
  const subjects = [...new Set(volumeInfo.categories ?? [])].slice(
    0,
    GOOGLE_BOOKS_MAX_SUBJECTS,
  )

  const title = titleWithSeriesNumber(volumeInfo)

  return omitUndefined({
    titles: title !== undefined ? [{ value: title }] : undefined,
    description: volumeInfo.description,
    publication:
      edition.date !== undefined || edition.publisher !== undefined
        ? { edition }
        : undefined,
    languages:
      volumeInfo.language !== undefined ? [volumeInfo.language] : undefined,
    subjects: emptyToUndefined(subjects),
    contributors: resolvedContributors(volumeInfo.authors ?? []),
    numberOfPages: volumeInfo.pageCount,
    identifiers,
    cover,
  })
}

/** The human-facing Google Books page for a candidate. */
export const googleBooksVolumeUrl = (
  volume: GoogleBooksVolume,
): string | undefined =>
  absoluteHttpUrl(volume.volumeInfo?.canonicalVolumeLink) ??
  absoluteHttpUrl(volume.volumeInfo?.infoLink) ??
  (volume.id !== undefined
    ? `https://books.google.com/books?id=${encodeURIComponent(volume.id)}`
    : undefined)
