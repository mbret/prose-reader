import { detectMimeTypeFromName } from "@prose-reader/shared"
import type { CentralDirectory } from "unzipper"
import { Report } from "../report"
import { sortByTitleComparator } from "../utils/sortByTitleComparator"
import { getUriBasename } from "../utils/uri"
import { createArchive } from "./createArchive"
import { arrayBufferFileAccessors } from "./fileAccessors"
import { printTree } from "./printTree"
import type { Archive } from "./types"

export const createArchiveFromUnzipper = async (
  directory: CentralDirectory,
  {
    orderByAlpha,
    name,
    encodingFormat,
  }: { orderByAlpha?: boolean; name?: string; encodingFormat?: string } = {},
): Promise<Archive> => {
  let files = directory.files

  if (orderByAlpha) {
    files = files.slice().sort((a, b) => sortByTitleComparator(a.path, b.path))
  }

  const archive = createArchive({
    filename: name,
    encodingFormat,
    records: files.map((file) => {
      const basename = getUriBasename(file.path)

      if (file.type === `Directory`) {
        return {
          dir: true,
          basename,
          uri: file.path,
        }
      }

      return {
        dir: false,
        basename,
        uri: file.path,
        encodingFormat: detectMimeTypeFromName(file.path),
        size: file.uncompressedSize,
        ...arrayBufferFileAccessors(async () => {
          const buffer = await file.buffer()
          // unzipper decodes into a regular Node `Buffer`, whose backing store
          // is always an `ArrayBuffer` (never a `SharedArrayBuffer`); the cast
          // only drops the `SharedArrayBuffer` arm that cannot occur here.
          const backing = buffer.buffer as ArrayBuffer

          // Non-pooled (large) allocations own a dedicated, exactly-sized
          // backing buffer, so they can be handed out without copying. Pooled
          // small buffers share their backing store with other entries and
          // must be sliced out.
          return buffer.byteOffset === 0 &&
            buffer.byteLength === backing.byteLength
            ? backing
            : backing.slice(
                buffer.byteOffset,
                buffer.byteOffset + buffer.byteLength,
              )
        }, detectMimeTypeFromName(file.path) ?? ``),
      }
    }),
    close: () => Promise.resolve(),
  })

  Report.log("Generated archive", archive)

  if (process.env.NODE_ENV === "development") {
    if (Report.isEnabled()) {
      const folderStructureStr = printTree(files.map((file) => file.path))
      Report.groupCollapsed(...Report.getGroupArgs("Archive folder structure"))
      Report.log(`\n${folderStructureStr}`)
      Report.groupEnd()
    }
  }

  return archive
}
