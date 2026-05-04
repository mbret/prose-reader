import type { ArchiveResolveResult } from "../types/archiveResolve"
import { normalizeGtin } from "../utils/normalizeGtin"
import { normalizeIsbn } from "../utils/normalizeIsbn"
import type { ComicInfo } from "./parse"

const readingDirection = (info: ComicInfo): "ltr" | "rtl" =>
  info.Manga === "YesAndRightToLeft" ? "rtl" : "ltr"

export const resolveComicInfo = (info: ComicInfo): ArchiveResolveResult => {
  const raw = info.GTIN
  const gtin = normalizeGtin(raw)
  const isbn = normalizeIsbn(raw)
  return {
    ...(gtin !== undefined ? { gtin } : {}),
    ...(isbn !== undefined ? { isbn } : {}),
    readingDirection: readingDirection(info),
  }
}
