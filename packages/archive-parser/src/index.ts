/**
 * Parsers and resolvers for archive-embedded metadata (ComicInfo, Kobo XML, …).
 * Parsed values carry a `kind` discriminator (`comicInfo` / `kobo` / `apple` / `opf`);
 * {@link resolveArchiveMetadata} accepts that union directly.
 */
export type { AppleDisplayOption, AppleMetadata } from "./apple/parse"
export {
  APPLE_IBOOKS_DISPLAY_OPTIONS_FILENAME,
  parseAppleDisplayOptionsXml,
} from "./apple/parse"
export type { ComicInfoManga } from "./comicInfo/manga"
export { COMIC_INFO_MANGA_VALUES, isComicInfoManga } from "./comicInfo/manga"
export type { ComicInfo } from "./comicInfo/parse"
export { COMIC_INFO_FILENAME, parseComicInfo } from "./comicInfo/parse"
export type { KoboMetadata } from "./kobo/parse"
export { KOBO_DISPLAY_OPTIONS_FILENAME, parseKoboXml } from "./kobo/parse"
export type {
  OpfGuideReference,
  OpfIdentifier,
  OpfMetadata,
  OpfSpineManifestItem,
  OpfSpineRow,
} from "./opf/parse"
export { parseOpf } from "./opf/parse"
export type { ResolvedArchiveInput } from "./resolve"
export { resolveArchiveMetadata } from "./resolve"
export type { ArchiveResolveResult } from "./types/archiveResolve"
export { normalizeGtin } from "./utils/normalizeGtin"
export { normalizeIsbn } from "./utils/normalizeIsbn"
export { parseW3cDtfDate } from "./utils/parseW3cDtfDate"
export { tokenizeXmlSpaceSeparatedList } from "./utils/tokenizeXmlSpaceSeparatedList"
