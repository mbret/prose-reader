import { COMIC_INFO_FILENAME } from "@prose-reader/archive-parser"
import { type Archive, type FileRecord, isFileRecord } from "./types"

const comicInfoFilenameLower = COMIC_INFO_FILENAME.toLowerCase()

export const getArchiveHasComicInfo = (archive: Archive) =>
  archive.records.find(
    (record): record is FileRecord =>
      isFileRecord(record) &&
      record.basename.toLowerCase() === comicInfoFilenameLower,
  )
