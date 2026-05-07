import type { ArchiveResolveResult } from "../types/archiveResolve"
import { normalizeGtin } from "../utils/normalizeGtin"
import { normalizeIsbn } from "../utils/normalizeIsbn"
import type { ComicInfo } from "./parse"

const readingDirection = (info: ComicInfo): "ltr" | "rtl" =>
  info.Manga === "YesAndRightToLeft" ? "rtl" : "ltr"

const trimToUndefined = (raw: string | undefined): string | undefined => {
  if (raw === undefined) return undefined
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/**
 * Split a comma-separated ComicInfo value into its individual tokens.
 * `Writer`, `Genre`, and `Tags` all follow the same de-facto convention:
 * tokens separated by `,`, with whitespace trimmed and empty tokens
 * dropped (real-world files leave trailing commas around).
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

const dateFromYearMonthDay = (
  info: ComicInfo,
):
  | {
      year?: number
      month?: number
      day?: number
    }
  | undefined => {
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

export const resolveComicInfo = (info: ComicInfo): ArchiveResolveResult => {
  const raw = info.GTIN
  const languageIso = trimToUndefined(info.LanguageISO)
  const authors = splitCommaList(info.Writer)
  const subjects = [...splitCommaList(info.Genre), ...splitCommaList(info.Tags)]

  return {
    gtin: normalizeGtin(raw),
    isbn: normalizeIsbn(raw),
    readingDirection: readingDirection(info),
    renditionLayout: undefined,
    title: trimToUndefined(info.Title),
    authors: authors.length > 0 ? authors : undefined,
    publisher: trimToUndefined(info.Publisher),
    rights: undefined,
    languages: languageIso !== undefined ? [languageIso] : undefined,
    date: dateFromYearMonthDay(info),
    subjects: subjects.length > 0 ? subjects : undefined,
  }
}
