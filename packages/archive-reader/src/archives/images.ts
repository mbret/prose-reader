import { detectMimeTypeFromName, parseContentType } from "@prose-reader/shared"
import type { Archive, ArchiveRecord, FileRecord } from "./types.ts"
import { isFileRecord } from "./types.ts"

/**
 * Best-effort media type of a file record: the archive's own encoding format
 * when known, else detected from the filename. Same derivation the reading
 * order and cover use.
 */
const mediaTypeForRecord = (record: FileRecord): string | undefined =>
  parseContentType(record.encodingFormat ?? "") ||
  detectMimeTypeFromName(record.basename)

/**
 * Whether a record is an image resource — an `image/*` media type by encoding
 * format or filename (the image formats real CBZ/CBR/EPUB producers use).
 * Directories are never images.
 */
export const isImageRecord = (record: ArchiveRecord): boolean =>
  isFileRecord(record) &&
  mediaTypeForRecord(record)?.startsWith("image/") === true

/**
 * Every image file record of the archive, in record order. The page listing
 * of a comic or image container, and the raster asset inventory of any book.
 */
export const getArchiveImageRecords = (archive: Archive): FileRecord[] =>
  archive.records.filter(isFileRecord).filter(isImageRecord)
