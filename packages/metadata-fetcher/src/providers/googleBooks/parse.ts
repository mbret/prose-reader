import {
  isJsonRecord,
  readNumber,
  readRecordArray,
  readString,
  readStringArray,
} from "../../utils/json.ts"
import { omitUndefined } from "../../utils/omitUndefined.ts"

export type GoogleBooksIndustryIdentifier = {
  readonly type?: string
  readonly identifier: string
}

export type GoogleBooksImageLinks = {
  readonly smallThumbnail?: string
  readonly thumbnail?: string
  readonly small?: string
  readonly medium?: string
  readonly large?: string
  readonly extraLarge?: string
}

export type GoogleBooksVolumeSeries = {
  readonly seriesId?: string
  readonly orderNumber?: number
}

/**
 * Only the volume's place in its series is retained. `bookDisplayNumber` and
 * `shortSeriesBookTitle` are display strings by Google's own definition — the
 * sequence is `orderNumber` — and the payload never states the series name,
 * only an id, so a name would have to be invented.
 */
export type GoogleBooksSeriesInfo = {
  readonly volumeSeries?: ReadonlyArray<GoogleBooksVolumeSeries>
}

/**
 * The subset of a Google Books `volumeInfo` record that has a normalized home.
 * Every field remains optional because the public catalog is sparse in practice.
 */
export type GoogleBooksVolumeInfo = {
  readonly title?: string
  readonly subtitle?: string
  readonly authors?: ReadonlyArray<string>
  readonly publisher?: string
  readonly publishedDate?: string
  readonly description?: string
  readonly industryIdentifiers?: ReadonlyArray<GoogleBooksIndustryIdentifier>
  readonly pageCount?: number
  readonly categories?: ReadonlyArray<string>
  /** Mean review rating; Google states it on a 1–5 scale, rounded to a half. */
  readonly averageRating?: number
  readonly ratingsCount?: number
  readonly language?: string
  readonly imageLinks?: GoogleBooksImageLinks
  readonly infoLink?: string
  readonly canonicalVolumeLink?: string
  readonly seriesInfo?: GoogleBooksSeriesInfo
}

/** One Google Books volume, retaining the source's nested field names. */
export type GoogleBooksVolume = {
  readonly id?: string
  readonly volumeInfo?: GoogleBooksVolumeInfo
}

const readRecord = (
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> | undefined => {
  const value = record[key]

  return isJsonRecord(value) ? value : undefined
}

const parseIndustryIdentifiers = (
  volumeInfo: Record<string, unknown>,
): ReadonlyArray<GoogleBooksIndustryIdentifier> | undefined => {
  const identifiers = readRecordArray(
    volumeInfo,
    "industryIdentifiers",
  ).flatMap((record) => {
    const identifier = readString(record, "identifier")

    return identifier !== undefined
      ? [
          omitUndefined({
            type: readString(record, "type"),
            identifier,
          }),
        ]
      : []
  })

  return identifiers.length > 0 ? identifiers : undefined
}

const parseImageLinks = (
  volumeInfo: Record<string, unknown>,
): GoogleBooksImageLinks | undefined => {
  const imageLinks = readRecord(volumeInfo, "imageLinks")

  if (imageLinks === undefined) return undefined

  const parsed = omitUndefined({
    smallThumbnail: readString(imageLinks, "smallThumbnail"),
    thumbnail: readString(imageLinks, "thumbnail"),
    small: readString(imageLinks, "small"),
    medium: readString(imageLinks, "medium"),
    large: readString(imageLinks, "large"),
    extraLarge: readString(imageLinks, "extraLarge"),
  })

  return Object.keys(parsed).length > 0 ? parsed : undefined
}

const parseSeriesInfo = (
  volumeInfo: Record<string, unknown>,
): GoogleBooksSeriesInfo | undefined => {
  const seriesInfo = readRecord(volumeInfo, "seriesInfo")

  if (seriesInfo === undefined) return undefined

  const volumeSeries = readRecordArray(seriesInfo, "volumeSeries").flatMap(
    (record) => {
      const parsed = omitUndefined({
        seriesId: readString(record, "seriesId"),
        orderNumber: readNumber(record, "orderNumber"),
      })

      return Object.keys(parsed).length > 0 ? [parsed] : []
    },
  )

  return volumeSeries.length > 0 ? { volumeSeries } : undefined
}

const parseVolumeInfo = (
  record: Record<string, unknown>,
): GoogleBooksVolumeInfo | undefined => {
  const volumeInfo = readRecord(record, "volumeInfo")

  if (volumeInfo === undefined) return undefined

  const parsed = omitUndefined({
    title: readString(volumeInfo, "title"),
    subtitle: readString(volumeInfo, "subtitle"),
    authors: readStringArray(volumeInfo, "authors"),
    publisher: readString(volumeInfo, "publisher"),
    publishedDate: readString(volumeInfo, "publishedDate"),
    description: readString(volumeInfo, "description"),
    industryIdentifiers: parseIndustryIdentifiers(volumeInfo),
    pageCount: readNumber(volumeInfo, "pageCount"),
    categories: readStringArray(volumeInfo, "categories"),
    averageRating: readNumber(volumeInfo, "averageRating"),
    ratingsCount: readNumber(volumeInfo, "ratingsCount"),
    language: readString(volumeInfo, "language"),
    imageLinks: parseImageLinks(volumeInfo),
    infoLink: readString(volumeInfo, "infoLink"),
    canonicalVolumeLink: readString(volumeInfo, "canonicalVolumeLink"),
    seriesInfo: parseSeriesInfo(volumeInfo),
  })

  return Object.keys(parsed).length > 0 ? parsed : undefined
}

/** Reads one public Google Books Volume resource from untrusted JSON. */
export const parseGoogleBooksVolume = (
  payload: unknown,
): GoogleBooksVolume | undefined => {
  if (!isJsonRecord(payload)) return undefined

  const parsed = omitUndefined({
    id: readString(payload, "id"),
    volumeInfo: parseVolumeInfo(payload),
  })

  return Object.keys(parsed).length > 0 ? parsed : undefined
}

/** Reads the `items` array of a Google Books volumes search response. */
export const parseGoogleBooksVolumesResponse = (
  payload: unknown,
): ReadonlyArray<GoogleBooksVolume> => {
  if (!isJsonRecord(payload)) return []

  return readRecordArray(payload, "items").flatMap((record) => {
    const volume = parseGoogleBooksVolume(record)

    return volume !== undefined ? [volume] : []
  })
}
