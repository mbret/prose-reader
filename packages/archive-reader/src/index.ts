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

export { createArchive } from "./archives/createArchive.ts"
export { createArchiveFromArrayBufferList } from "./archives/createArchiveFromArrayBufferList.ts"
export {
  type ArchiveEntry,
  type CreateArchiveFromEntriesOptions,
  createArchiveFromEntries,
} from "./archives/createArchiveFromEntries.ts"
export { createArchiveFromText } from "./archives/createArchiveFromText.ts"
export { createArchiveFromUrls } from "./archives/createArchiveFromUrls.ts"
export {
  arrayBufferFileAccessors,
  blobFileAccessors,
} from "./archives/fileAccessors.ts"
export {
  getArchiveImageRecords,
  isImageRecord,
} from "./archives/images.ts"
export { readRecordAsText } from "./archives/readRecordAsText.ts"
export type {
  Archive,
  ArchiveRecord,
  DirectoryRecord,
  FileRecord,
} from "./archives/types.ts"
export {
  getArchiveFileRecordByUri,
  isDirectoryRecord,
  isFileRecord,
} from "./archives/types.ts"
export { resolveArchiveCover } from "./cover/resolveArchiveCover.ts"
export { readingOrderDocumentsAllHaveViewport } from "./layout/scanReadingOrderDocumentsViewport.ts"
export type {
  AppleDisplayOption,
  AppleMetadata,
} from "./metadata/apple/parse.ts"
export {
  APPLE_IBOOKS_DISPLAY_OPTIONS_FILENAME,
  parseAppleDisplayOptionsXml,
} from "./metadata/apple/parse.ts"
export { readArchiveApple } from "./metadata/apple/readArchiveApple.ts"
export { getArchiveHasComicInfo } from "./metadata/comicInfo/getArchiveHasComicInfo.ts"
export type { ComicInfoManga } from "./metadata/comicInfo/manga.ts"
export {
  COMIC_INFO_MANGA_VALUES,
  isComicInfoManga,
} from "./metadata/comicInfo/manga.ts"
export type {
  ComicInfo,
  ComicInfoKnownField,
} from "./metadata/comicInfo/parse.ts"
export {
  COMIC_INFO_FILENAME,
  COMIC_INFO_KNOWN_FIELDS,
  parseComicInfo,
} from "./metadata/comicInfo/parse.ts"
export { readArchiveComicInfo } from "./metadata/comicInfo/readArchiveComicInfo.ts"
export type { KoboMetadata } from "./metadata/kobo/parse.ts"
export {
  KOBO_DISPLAY_OPTIONS_FILENAME,
  parseKoboXml,
} from "./metadata/kobo/parse.ts"
export { readArchiveKobo } from "./metadata/kobo/readArchiveKobo.ts"
export { getArchiveOpfInfo } from "./metadata/opf/getArchiveOpfInfo.ts"
export { getSpineItemFilesFromArchive } from "./metadata/opf/getSpineItemFilesFromArchive.ts"
export { isArchiveEpub } from "./metadata/opf/isArchiveEpub.ts"
export type {
  OpfContributor,
  OpfGuideReference,
  OpfIdentifier,
  OpfMetadata,
  OpfMetaEntry,
  OpfSpineManifestItem,
  OpfSpineRow,
} from "./metadata/opf/parse.ts"
export { parseOpf } from "./metadata/opf/parse.ts"
export type { ArchiveOpfParsed } from "./metadata/opf/readArchiveOpf.ts"
export { readArchiveOpf } from "./metadata/opf/readArchiveOpf.ts"
export type { ArchiveReadingOrderItem } from "./readingOrder/resolveArchiveReadingOrder.ts"
export { resolveArchiveReadingOrder } from "./readingOrder/resolveArchiveReadingOrder.ts"
export type { ResolvedArchiveInput } from "./resolve.ts"
export { resolveArchiveMetadata } from "./resolve.ts"
export type {
  ResolveArchiveOptions,
  ResolveArchiveToken,
  ResolvedArchive,
  ResolvedArchiveSourceKind,
  ResolvedArchiveSources,
} from "./resolveArchive.ts"
export { resolveArchive } from "./resolveArchive.ts"
export type { ResolveMetadataSources } from "./resolveMetadata.ts"
export { resolveMetadata } from "./resolveMetadata.ts"
export { resolveArchiveToc } from "./toc/resolveArchiveToc.ts"
export type { ArchiveTocItem } from "./toc/types.ts"
export type { Exhaustive } from "./types/exhaustive.ts"
export type {
  KnownMetadataIdentifierScheme,
  MetadataIdentifier,
  MetadataIdentifierScheme,
  ResolvedAggregateRating,
  ResolvedAppleMetadata,
  ResolvedCollection,
  ResolvedComicInfoMetadata,
  ResolvedConfidence,
  ResolvedContributor,
  ResolvedContributorRole,
  ResolvedCover,
  ResolvedDate,
  ResolvedKoboMetadata,
  ResolvedMetadata,
  ResolvedMetadataIdentifier,
  ResolvedProperty,
  ResolvedPublication,
  ResolvedPublicationInfo,
  ResolvedTitle,
  ResolvedTitleType,
} from "./types/resolvedMetadata.ts"
export type { MetadataCatalogScheme } from "./utils/catalogIdentifiers.ts"
export {
  catalogIdentifierFromUrl,
  catalogUrlFromIdentifier,
  isMetadataCatalogScheme,
  METADATA_CATALOG_SCHEMES,
} from "./utils/catalogIdentifiers.ts"
export type { DerivableIdentifierScheme } from "./utils/identifierValues.ts"
export {
  identifierValue,
  isIsbnBearingScheme,
} from "./utils/identifierValues.ts"
export { mainTitle } from "./utils/mainTitle.ts"
export { normalizeGtin } from "./utils/normalizeGtin.ts"
export { normalizeIdentifierScheme } from "./utils/normalizeIdentifierScheme.ts"
export { normalizeIsbn } from "./utils/normalizeIsbn.ts"
export { parseW3cDtfDate } from "./utils/parseW3cDtfDate.ts"
export { tokenizeXmlSpaceSeparatedList } from "./utils/tokenizeXmlSpaceSeparatedList.ts"
