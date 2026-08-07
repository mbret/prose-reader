import type { Exhaustive } from "../../types/exhaustive.ts"
import type {
  ResolvedCollection,
  ResolvedComicInfoMetadata,
  ResolvedContributor,
  ResolvedContributorRole,
  ResolvedDate,
  ResolvedMetadata,
  ResolvedMetadataIdentifier,
} from "../../types/resolvedMetadata.ts"
import { omitUndefined } from "../../utils/omitUndefined.ts"
import type { ComicInfo, ComicInfoKnownField } from "./parse.ts"

const readingDirection = (info: ComicInfo): "ltr" | "rtl" | undefined => {
  switch (info.Manga) {
    case "YesAndRightToLeft":
      return "rtl"
    case "Yes":
    case "No":
      return "ltr"
    default:
      return undefined
  }
}

const trimToUndefined = (raw: string | undefined): string | undefined => {
  if (raw === undefined) return undefined
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/**
 * Split a comma-separated ComicInfo value into its individual tokens.
 * `Writer`, `Genre`, `Tags`, `Characters`… all follow the same de facto
 * schema convention: tokens separated by `,`, with whitespace trimmed and
 * empty tokens dropped (real-world files leave trailing commas around).
 */
const splitCommaList = (raw: string | undefined): string[] => {
  if (raw === undefined) return []
  return raw
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
}

const parseNonNegativeInt = (raw: string | undefined): number | undefined => {
  const trimmed = trimToUndefined(raw)
  if (trimmed === undefined) return undefined
  if (!/^\d+$/.test(trimmed)) return undefined
  const n = Number.parseInt(trimmed, 10)
  return Number.isFinite(n) ? n : undefined
}

/** Non-negative decimal ("1", "1.5"); anything else is undefined. */
const parseDecimal = (raw: string | undefined): number | undefined => {
  const trimmed = trimToUndefined(raw)
  if (trimmed === undefined) return undefined
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return undefined
  const n = Number.parseFloat(trimmed)
  return Number.isFinite(n) ? n : undefined
}

/** Schema yes/no enums (`Yes`/`No`/`Unknown`), tolerant on casing. */
const parseYesNo = (raw: string | undefined): boolean | undefined => {
  const normalized = trimToUndefined(raw)?.toLowerCase()
  if (normalized === "yes") return true
  if (normalized === "no") return false
  return undefined
}

/** Same schema-literal matching as {@link readingDirection}. */
const mangaFlag = (info: ComicInfo): boolean | undefined => {
  switch (info.Manga) {
    case "Yes":
    case "YesAndRightToLeft":
      return true
    case "No":
      return false
    default:
      return undefined
  }
}

const dateFromYearMonthDay = (info: ComicInfo): ResolvedDate | undefined => {
  const year = parseNonNegativeInt(info.Year)
  const month = parseNonNegativeInt(info.Month)
  const day = parseNonNegativeInt(info.Day)

  if (year === undefined && month === undefined && day === undefined) {
    return undefined
  }

  return {
    ...(year !== undefined ? { year } : {}),
    ...(month !== undefined ? { month } : {}),
    ...(day !== undefined ? { day } : {}),
  }
}

const COMIC_INFO_ROLE_FIELDS = [
  ["Writer", "author"],
  ["Penciller", "penciler"],
  ["Inker", "inker"],
  ["Colorist", "colorist"],
  ["Letterer", "letterer"],
  ["CoverArtist", "coverArtist"],
  ["Editor", "editor"],
  ["Translator", "translator"],
] as const satisfies ReadonlyArray<
  [ComicInfoKnownField, ResolvedContributorRole]
>

/**
 * One entry per person: a name appearing in several role fields (writes and
 * inks their own book) gets its roles merged, in field order above.
 */
const contributorsFromComicInfo = (info: ComicInfo): ResolvedContributor[] => {
  const byName = new Map<string, { name: string; roles: string[] }>()

  for (const [field, role] of COMIC_INFO_ROLE_FIELDS) {
    for (const name of splitCommaList(info[field])) {
      const existing = byName.get(name)
      if (existing) {
        if (!existing.roles.includes(role)) existing.roles.push(role)
      } else {
        byName.set(name, { name, roles: [role] })
      }
    }
  }

  return [...byName.values()]
}

/**
 * `Number` and `Count` are facts about this issue's place in its series,
 * which a sidecar can state without naming the series — so a nameless entry
 * is still emitted rather than dropping what the file says.
 */
const seriesFromComicInfo = (
  info: ComicInfo,
): ResolvedCollection | undefined => {
  const series = omitUndefined({
    name: trimToUndefined(info.Series),
    position: parseDecimal(info.Number),
    total: parseNonNegativeInt(info.Count),
  })

  return Object.keys(series).length > 0 ? series : undefined
}

const alternateSeriesFromComicInfo = (
  info: ComicInfo,
): ResolvedCollection | undefined => {
  const name = trimToUndefined(info.AlternateSeries)
  if (name === undefined) return undefined

  return omitUndefined({
    name,
    position: parseDecimal(info.AlternateNumber),
    total: parseNonNegativeInt(info.AlternateCount),
  })
}

/** `StoryArc`/`StoryArcNumber` are comma lists zipped positionally. */
const storyArcsFromComicInfo = (info: ComicInfo): ResolvedCollection[] => {
  const names = splitCommaList(info.StoryArc)
  if (names.length === 0) return []

  const positions = splitCommaList(info.StoryArcNumber)

  return names.map((name, index) =>
    omitUndefined({ name, position: parseDecimal(positions[index]) }),
  )
}

const emptyToUndefined = <T>(
  values: ReadonlyArray<T>,
): ReadonlyArray<T> | undefined => (values.length > 0 ? values : undefined)

const webFromComicInfo = (info: ComicInfo): ReadonlyArray<string> =>
  (info.Web ?? "").split(/\s+/).filter((token) => token.length > 0)

const isAbsoluteHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value)

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.hostname.length > 0
    )
  } catch {
    return false
  }
}

const webIdentifiers = (
  values: ReadonlyArray<string>,
): ReadonlyArray<ResolvedMetadataIdentifier> =>
  values
    .filter(
      (value, index, all) =>
        isAbsoluteHttpUrl(value) && all.indexOf(value) === index,
    )
    .map((value) => ({ value, scheme: "URL" }))

const comicCornerFromComicInfo = (
  info: ComicInfo,
  webValues: ReadonlyArray<string>,
): ResolvedMetadata["comicInfo"] => {
  const corner = omitUndefined({
    manga: mangaFlag(info),
    blackAndWhite: parseYesNo(info.BlackAndWhite),
    volume: parseNonNegativeInt(info.Volume),
    format: trimToUndefined(info.Format),
    ageRating: trimToUndefined(info.AgeRating),
    communityRating: parseDecimal(info.CommunityRating),
    notes: trimToUndefined(info.Notes),
    review: trimToUndefined(info.Review),
    web: emptyToUndefined(webValues),
    scanInformation: trimToUndefined(info.ScanInformation),
    mainCharacterOrTeam: trimToUndefined(info.MainCharacterOrTeam),
    characters: emptyToUndefined(splitCommaList(info.Characters)),
    teams: emptyToUndefined(splitCommaList(info.Teams)),
    locations: emptyToUndefined(splitCommaList(info.Locations)),
    storyArcs: emptyToUndefined(storyArcsFromComicInfo(info)),
    alternateSeries: alternateSeriesFromComicInfo(info),
  } satisfies Exhaustive<ResolvedComicInfoMetadata>)

  return Object.keys(corner).length > 0 ? corner : undefined
}

const belongsToFromComicInfo = (
  info: ComicInfo,
): ResolvedMetadata["belongsTo"] => {
  const series = seriesFromComicInfo(info)
  const collection = emptyToUndefined(
    splitCommaList(info.SeriesGroup).map((name) => ({ name })),
  )

  if (series === undefined && collection === undefined) return undefined

  return omitUndefined({
    series: series !== undefined ? [series] : undefined,
    collection,
  })
}

export const resolveComicInfo = (info: ComicInfo): ResolvedMetadata => {
  const rawGtin = info.GTIN
  const gtinTrimmed = trimToUndefined(rawGtin)
  const web = webFromComicInfo(info)
  const identifiers: ReadonlyArray<ResolvedMetadataIdentifier> = [
    ...(gtinTrimmed !== undefined
      ? [{ value: gtinTrimmed, scheme: "GTIN" }]
      : []),
    ...webIdentifiers(web),
  ]
  const languageIso = trimToUndefined(info.LanguageISO)
  const subjects = [...splitCommaList(info.Genre), ...splitCommaList(info.Tags)]
  const edition = omitUndefined({
    date: dateFromYearMonthDay(info),
    publisher: trimToUndefined(info.Publisher),
    imprint: trimToUndefined(info.Imprint),
  })

  const title = trimToUndefined(info.Title)

  return omitUndefined({
    titles: title !== undefined ? [{ value: title }] : undefined,
    description: trimToUndefined(info.Summary),
    publication:
      edition.date !== undefined ||
      edition.publisher !== undefined ||
      edition.imprint !== undefined
        ? { edition }
        : undefined,
    languages: languageIso !== undefined ? [languageIso] : undefined,
    subjects: emptyToUndefined(subjects),
    contributors: emptyToUndefined(contributorsFromComicInfo(info)),
    readingDirection: readingDirection(info),
    numberOfPages: parseNonNegativeInt(info.PageCount),
    identifiers: emptyToUndefined(identifiers),
    belongsTo: belongsToFromComicInfo(info),
    comicInfo: comicCornerFromComicInfo(info, web),
  })
}
