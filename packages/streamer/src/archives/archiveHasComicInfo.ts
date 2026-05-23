import { COMIC_INFO_FILENAME } from "@prose-reader/archive-parser"
import type { Archive } from "./types"

const comicInfoFilenameLower = COMIC_INFO_FILENAME.toLowerCase()

export const getArchiveHasComicInfo = (archive: Archive) =>
  archive.records.find(
    (file) =>
      !file.dir && file.basename.toLowerCase() === comicInfoFilenameLower,
  )
