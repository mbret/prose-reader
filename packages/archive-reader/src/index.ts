/**
 * The generic, environment-agnostic view of a book's container (an EPUB zip, a
 * CBZ, a folder of images, a list of URLs…): the {@link Archive} type, the
 * `createArchiveFrom*` creators producing it, and the parsers/resolvers for
 * archive-embedded metadata (OPF, ComicInfo, Kobo XML, …). Parsed metadata
 * carries a `kind` discriminator (`comicInfo` / `kobo` / `apple` / `opf`);
 * {@link resolveArchiveMetadata} accepts that union directly.
 *
 * Creators requiring an optional peer dependency (jszip, zip.js, libarchive.js,
 * node-unrar-js, unzipper) ship as subpath exports, e.g.
 * `@prose-reader/archive-reader/archives/createArchiveFromJszip`.
 */
export type { AppleDisplayOption, AppleMetadata } from "./apple/parse"
export {
  APPLE_IBOOKS_DISPLAY_OPTIONS_FILENAME,
  parseAppleDisplayOptionsXml,
} from "./apple/parse"
export { createArchive } from "./archives/createArchive"
export { createArchiveFromArrayBufferList } from "./archives/createArchiveFromArrayBufferList"
export {
  type ArchiveEntry,
  type CreateArchiveFromEntriesOptions,
  createArchiveFromEntries,
} from "./archives/createArchiveFromEntries"
export { createArchiveFromText } from "./archives/createArchiveFromText"
export { createArchiveFromUrls } from "./archives/createArchiveFromUrls"
export {
  arrayBufferFileAccessors,
  blobFileAccessors,
} from "./archives/fileAccessors"
export { readRecordAsText } from "./archives/readRecordAsText"
export type {
  Archive,
  ArchiveRecord,
  DirectoryRecord,
  FileRecord,
} from "./archives/types"
export {
  getArchiveFileRecordByUri,
  isDirectoryRecord,
  isFileRecord,
} from "./archives/types"
export { getArchiveHasComicInfo } from "./comicInfo/getArchiveHasComicInfo"
export type { ComicInfoManga } from "./comicInfo/manga"
export { COMIC_INFO_MANGA_VALUES, isComicInfoManga } from "./comicInfo/manga"
export type { ComicInfo } from "./comicInfo/parse"
export { COMIC_INFO_FILENAME, parseComicInfo } from "./comicInfo/parse"
export type { KoboMetadata } from "./kobo/parse"
export { KOBO_DISPLAY_OPTIONS_FILENAME, parseKoboXml } from "./kobo/parse"
export { getArchiveOpfInfo } from "./opf/getArchiveOpfInfo"
export { getSpineItemFilesFromArchive } from "./opf/getSpineItemFilesFromArchive"
export { isArchiveEpub } from "./opf/isArchiveEpub"
export type {
  OpfGuideReference,
  OpfIdentifier,
  OpfMetadata,
  OpfSpineManifestItem,
  OpfSpineRow,
} from "./opf/parse"
export { parseOpf } from "./opf/parse"
export type { ArchiveOpfParsed } from "./opf/readArchiveOpf"
export { readArchiveOpf } from "./opf/readArchiveOpf"
export type { ResolvedArchiveInput } from "./resolve"
export { resolveArchiveMetadata } from "./resolve"
export type { ArchiveResolveResult } from "./types/archiveResolve"
export { normalizeGtin } from "./utils/normalizeGtin"
export { normalizeIsbn } from "./utils/normalizeIsbn"
export { parseW3cDtfDate } from "./utils/parseW3cDtfDate"
export { tokenizeXmlSpaceSeparatedList } from "./utils/tokenizeXmlSpaceSeparatedList"
