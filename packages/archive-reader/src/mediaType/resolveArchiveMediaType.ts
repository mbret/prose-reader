import { getUrlExtension, parseContentType } from "@prose-reader/shared"
import type { Archive } from "../archives/types.ts"

/**
 * Book file extensions and their media type: the IANA-registered one where
 * there is one, the one readers use otherwise (`application/x-cb7`,
 * `application/x-tar`, `application/vnd.comicbook+tar`, KOReader's).
 */
const BOOK_MEDIA_TYPE_BY_EXTENSION: ReadonlyMap<string, string> = new Map([
  ["epub", "application/epub+zip"],
  ["pdf", "application/pdf"],
  ["cbz", "application/vnd.comicbook+zip"],
  ["cbr", "application/vnd.comicbook-rar"],
  ["cbt", "application/vnd.comicbook+tar"],
  ["cb7", "application/x-cb7"],
  ["zip", "application/zip"],
  ["rar", "application/vnd.rar"],
  ["tar", "application/x-tar"],
  ["txt", "text/plain"],
])

/**
 * Every EPUB container holds it (EPUB 3.3, OCF, "Container file"), and no
 * archive prose synthesizes does: those for a PDF, a text or a list of URLs
 * hold a package document, so one is no sign of an EPUB.
 */
const OCF_CONTAINER_FILE_URI = "meta-inf/container.xml"

const hasOcfContainerFile = (archive: Archive) =>
  archive.records.some(
    (record) =>
      !record.dir && record.uri.toLowerCase() === OCF_CONTAINER_FILE_URI,
  )

/**
 * The media type of the file a book was opened from, when nothing tells it:
 * IANA's type for data of an unknown type, the one HTTP has a recipient
 * assume when no type is given (RFC 9110, "Content-Type").
 */
const UNKNOWN_BOOK_MEDIA_TYPE = "application/octet-stream"

/**
 * What a server declares for bytes it has no type for, as GitHub does for any
 * binary file: it tells nothing.
 */
const UNTYPED_MEDIA_TYPES: ReadonlySet<string> = new Set([
  UNKNOWN_BOOK_MEDIA_TYPE,
  "binary/octet-stream",
])

/**
 * Bare archive formats, which an EPUB or a CBZ also is: declared, they tell
 * less than the file's extension or an EPUB container does.
 */
const ARCHIVE_MEDIA_TYPES: ReadonlySet<string> = new Set([
  "application/zip",
  "application/x-zip",
  "application/x-zip-compressed",
  "application/vnd.rar",
  "application/x-rar",
  "application/x-rar-compressed",
  "application/x-tar",
  "application/x-7z-compressed",
])

/**
 * The media type of the file the book was opened from: what the archive
 * declares (`encodingFormat`), else what its file name's extension registers,
 * else `application/epub+zip` for an EPUB container, else
 * `application/octet-stream`. A declared bare archive format gives way to the
 * extension and the container, and stands only when neither tells, and a
 * declared `application/octet-stream` tells nothing: servers declare them for
 * files they know no better. Any other declared type is returned as declared,
 * parameters dropped, so an alias such as `application/x-cbz` stays one.
 */
export const resolveArchiveMediaType = (archive: Archive): string => {
  const parsed =
    parseContentType(archive.encodingFormat?.trim() ?? "")?.trim() ?? ""
  const declared = UNTYPED_MEDIA_TYPES.has(parsed.toLowerCase()) ? "" : parsed

  if (declared && !ARCHIVE_MEDIA_TYPES.has(declared.toLowerCase()))
    return declared

  const fromFilename = BOOK_MEDIA_TYPE_BY_EXTENSION.get(
    getUrlExtension(archive.filename ?? "").toLowerCase(),
  )

  if (fromFilename) return fromFilename

  if (hasOcfContainerFile(archive)) return "application/epub+zip"

  return declared || UNKNOWN_BOOK_MEDIA_TYPE
}
