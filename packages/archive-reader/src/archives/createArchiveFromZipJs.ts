import { detectMimeTypeFromName } from "@prose-reader/shared"
import type { ZipReader } from "@zip.js/zip.js"
import { createArchiveFromEntries } from "./createArchiveFromEntries.ts"
import { arrayBufferFileAccessors } from "./fileAccessors.ts"
import type { Archive } from "./types.ts"

export const createArchiveFromZipJs = async (
  zipReader: ZipReader<unknown>,
  options: {
    orderByAlpha?: boolean
    name?: string
    encodingFormat?: string
  } = {},
): Promise<Archive> => {
  const entries = await zipReader.getEntries()

  return createArchiveFromEntries(
    entries,
    (entry) =>
      entry.directory
        ? { dir: true, uri: entry.filename }
        : {
            dir: false,
            uri: entry.filename,
            size: entry.uncompressedSize,
            ...arrayBufferFileAccessors(
              () => entry.arrayBuffer(),
              detectMimeTypeFromName(entry.filename) ?? ``,
            ),
          },
    { ...options, close: () => zipReader.close() },
  )
}
