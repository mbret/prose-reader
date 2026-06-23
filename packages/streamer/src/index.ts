export type { Manifest } from "@prose-reader/shared"
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
export { getArchiveHasComicInfo } from "./archives/getArchiveHasComicInfo"
export { readRecordAsText } from "./archives/readRecordAsText"
export type { Archive, ArchiveRecord } from "./archives/types"
export {
  getArchiveFileRecordByUri,
  isDirectoryRecord,
  isFileRecord,
} from "./archives/types"
export { configure } from "./configure"
export { getArchiveOpfInfo } from "./epubs/getArchiveOpfInfo"
export { generateManifestFromArchive } from "./generators/manifest"
export { generateResourceFromArchive } from "./generators/resources"
export type {
  HookResource,
  StreamerHooks,
  StreamerManifestHook,
  StreamerManifestHookContext,
  StreamerManifestHookFactory,
  StreamerManifestHooks,
  StreamerResourceHook,
  StreamerResourceHookContext,
  StreamerResourceHookFactory,
} from "./hooks"
export { ServiceWorkerStreamer } from "./ServiceWorkerStreamer"
export { Streamer } from "./Streamer"
export * from "./utils/createXmlSafeId"
export * from "./utils/sortByTitleComparator"
export * from "./utils/uri"
