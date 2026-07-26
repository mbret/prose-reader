/**
 * The generic, environment-agnostic view of a book's container (an EPUB zip, a
 * CBZ, a folder of images, a list of URLs…): the {@link Archive} type, the
 * `createArchiveFrom*` creators producing it, and the parsers/resolvers for
 * archive-embedded metadata (OPF, ComicInfo, Kobo XML, …). Parsed metadata
 * carries a `kind` discriminator (`comicInfo` / `kobo` / `apple` / `opf`);
 * {@link resolveArchiveMetadata} accepts that union directly, and
 * {@link resolveArchiveToc} resolves the table of contents (EPUB nav document,
 * NCX, folder hierarchy) into container-relative JSON.
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
export { readArchiveApple } from "./apple/readArchiveApple"
export { appleMetadataHomes } from "./apple/resolve"
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
export {
  getArchiveImageRecords,
  isImageRecord,
} from "./archives/images"
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
export type { ComicInfo, ComicInfoKnownField } from "./comicInfo/parse"
export {
  COMIC_INFO_FILENAME,
  COMIC_INFO_KNOWN_FIELDS,
  parseComicInfo,
} from "./comicInfo/parse"
export { readArchiveComicInfo } from "./comicInfo/readArchiveComicInfo"
export { comicInfoMetadataHomes } from "./comicInfo/resolve"
export { resolveArchiveCover } from "./cover/resolveArchiveCover"
export type { KoboMetadata } from "./kobo/parse"
export { KOBO_DISPLAY_OPTIONS_FILENAME, parseKoboXml } from "./kobo/parse"
export { readArchiveKobo } from "./kobo/readArchiveKobo"
export { koboMetadataHomes } from "./kobo/resolve"
export { readingOrderDocumentsAllHaveViewport } from "./layout/scanReadingOrderDocumentsViewport"
export { getArchiveOpfInfo } from "./opf/getArchiveOpfInfo"
export { getSpineItemFilesFromArchive } from "./opf/getSpineItemFilesFromArchive"
export { isArchiveEpub } from "./opf/isArchiveEpub"
export type {
  OpfContributor,
  OpfGuideReference,
  OpfIdentifier,
  OpfMetadata,
  OpfMetaEntry,
  OpfSpineManifestItem,
  OpfSpineRow,
} from "./opf/parse"
export { parseOpf } from "./opf/parse"
export type { ArchiveOpfParsed } from "./opf/readArchiveOpf"
export { readArchiveOpf } from "./opf/readArchiveOpf"
export { opfMetadataHomes } from "./opf/resolve"
export type { ArchiveReadingOrderItem } from "./readingOrder/resolveArchiveReadingOrder"
export { resolveArchiveReadingOrder } from "./readingOrder/resolveArchiveReadingOrder"
export type { ResolvedArchiveInput } from "./resolve"
export { resolveArchiveMetadata } from "./resolve"
export type {
  ResolveArchiveOptions,
  ResolveArchiveToken,
  ResolvedArchive,
  ResolvedArchiveSourceKind,
  ResolvedArchiveSources,
} from "./resolveArchive"
export { resolveArchive } from "./resolveArchive"
export type { ResolveMetadataSources } from "./resolveMetadata"
export { resolveMetadata } from "./resolveMetadata"
export { resolveArchiveToc } from "./toc/resolveArchiveToc"
export type { ArchiveTocItem } from "./toc/types"
export type {
  ResolvedAppleMetadata,
  ResolvedCollection,
  ResolvedComicMetadata,
  ResolvedConfidence,
  ResolvedContributor,
  ResolvedContributorRole,
  ResolvedCover,
  ResolvedDate,
  ResolvedKoboMetadata,
  ResolvedMetadata,
  ResolvedMetadataHome,
  ResolvedProperty,
} from "./types/resolvedMetadata"
export { normalizeGtin } from "./utils/normalizeGtin"
export { normalizeIsbn } from "./utils/normalizeIsbn"
export { parseW3cDtfDate } from "./utils/parseW3cDtfDate"
export { tokenizeXmlSpaceSeparatedList } from "./utils/tokenizeXmlSpaceSeparatedList"
