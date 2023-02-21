export { generateResourceFromArchive, generateResourceFromError } from "./generators/resources"
export { generateManifestFromArchive } from "./generators/manifest"

export { getArchiveOpfInfo } from "./archives/getArchiveOpfInfo"

export { createArchiveFromUrls } from "./archives/createArchiveFromUrls"
export { createArchiveFromText } from "./archives/createArchiveFromText"
export { createArchiveFromJszip } from "./archives/createArchiveFromJszip"
export { createArchiveFromArrayBufferList } from "./archives/createArchiveFromArrayBufferList"

export type { Manifest } from "@prose-reader/shared"
export type { Archive } from "./archives/types"

export { configure } from "./configure"
