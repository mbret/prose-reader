/**
 * What a KOReader sync server's `progress` holds for a book: a crengine
 * xpointer, or a 1-based page number written as a string ("12").
 */
export type KoreaderProgressKind = "xpointer" | "page"

/** Books KOReader opens with crengine, whose `progress` is an xpointer. */
const XPOINTER_BOOK_MEDIA_TYPES: ReadonlySet<string> = new Set([
  "application/epub+zip",
  "application/epub",
])

/**
 * Books KOReader opens with MuPDF, whose `progress` is a page number: a PDF
 * and a comic archive.
 */
const PAGE_BOOK_MEDIA_TYPES: ReadonlySet<string> = new Set([
  "application/pdf",
  "application/vnd.comicbook+zip",
  "application/x-cbz",
  "application/vnd.comicbook-rar",
  "application/vnd.rar",
  "application/x-cbr",
  "application/vnd.comicbook+tar",
  "application/x-cbt",
])

/**
 * The form of a book's `progress`, from the media type of its file. KOReader's
 * sync plugin picks the form from the engine that opened the book (`has_pages`
 * in `plugins/kosync.koplugin/main.lua`), and KOReader picks the engine from
 * the file's extension (`frontend/document/documentregistry.lua`):
 *
 * - `"xpointer"` for an EPUB, opened with crengine.
 * - `"page"` for a PDF or a CBZ, CBR or CBT, opened with MuPDF.
 * - `undefined` for anything else, `application/octet-stream` included. A
 *   plain text file is opened with crengine too, but crengine builds its own
 *   document from the text, with paragraphs and headings it detects, and no
 *   xpointer into it can be computed from the text alone. A plain ZIP is
 *   opened with the engine its first file calls for, which its media type
 *   does not tell: a caller that knows a ZIP opens as a comic gives it a
 *   comic's media type.
 *
 * A KOReader user can choose MuPDF for a single EPUB, which then syncs page
 * numbers; nothing in the file says so.
 */
export const getKoreaderProgressKind = (
  mediaType: string,
): KoreaderProgressKind | undefined => {
  const essence = mediaType.split(";")[0]?.trim().toLowerCase() ?? ""

  if (XPOINTER_BOOK_MEDIA_TYPES.has(essence)) return "xpointer"
  if (PAGE_BOOK_MEDIA_TYPES.has(essence)) return "page"

  return undefined
}
