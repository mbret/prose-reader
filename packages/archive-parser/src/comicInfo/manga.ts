/**
 * Allowed `Manga` element values (ComicInfo 2.0 `Manga` simpleType).
 *
 * @see https://anansi-project.github.io/docs/comicinfo/documentation#manga
 */
export const COMIC_INFO_MANGA_VALUES = [
  "Unknown",
  "No",
  "Yes",
  "YesAndRightToLeft",
] as const

export type ComicInfoManga = (typeof COMIC_INFO_MANGA_VALUES)[number]

export const isComicInfoManga = (value: string): value is ComicInfoManga => {
  for (const v of COMIC_INFO_MANGA_VALUES) {
    if (v === value) return true
  }
  return false
}
