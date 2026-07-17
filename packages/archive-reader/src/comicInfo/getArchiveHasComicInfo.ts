import { type Archive, type FileRecord, isFileRecord } from "../archives/types"
import { COMIC_INFO_FILENAME } from "./parse"

const comicInfoFilenameLower = COMIC_INFO_FILENAME.toLowerCase()

export const getArchiveHasComicInfo = (archive: Archive) =>
  archive.records.find(
    (record): record is FileRecord =>
      isFileRecord(record) &&
      record.basename.toLowerCase() === comicInfoFilenameLower,
  )
