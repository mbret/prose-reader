import { detectMimeTypeFromName } from "@prose-reader/shared"
import type { Extractor } from "node-unrar-js"
import { createArchiveFromEntries } from "./createArchiveFromEntries"
import { arrayBufferFileAccessors } from "./fileAccessors"
import type { Archive } from "./types"

/**
 * `node-unrar-js`'s `extract({ files })` returns a generator that keeps WASM
 * resources alive until it is consumed end-to-end; spreading into an array is
 * the documented way to drain and free it.
 */
const extractEntryBytes = (
  extractor: Extractor<Uint8Array>,
  uri: string,
): Uint8Array => {
  const extracted = extractor.extract({ files: [uri] })
  const files = [...extracted.files]
  const bytes = files[0]?.extraction

  if (!bytes) {
    throw new Error(
      `node-unrar-js failed to extract entry "${uri}" from the RAR archive`,
    )
  }

  return bytes
}

export const createArchiveFromNodeUnrarJs = async (
  extractor: Extractor<Uint8Array>,
  options: {
    orderByAlpha?: boolean
    name?: string
    encodingFormat?: string
  } = {},
): Promise<Archive> =>
  createArchiveFromEntries(
    [...extractor.getFileList().fileHeaders],
    (header) =>
      header.flags.directory
        ? { dir: true, uri: header.name }
        : {
            dir: false,
            uri: header.name,
            size: header.unpSize,
            ...arrayBufferFileAccessors(async () => {
              const bytes = extractEntryBytes(extractor, header.name)
              // node-unrar-js extracts into a regular `Uint8Array`, whose
              // backing store is always an `ArrayBuffer` (never a
              // `SharedArrayBuffer`); the cast only drops the
              // `SharedArrayBuffer` arm that cannot occur here.
              const backing = bytes.buffer as ArrayBuffer

              // Each extraction returns a fresh, exactly-sized buffer that the
              // entry owns outright, so when the view spans the whole buffer it
              // can be handed out without copying.
              return bytes.byteOffset === 0 &&
                bytes.byteLength === backing.byteLength
                ? backing
                : backing.slice(
                    bytes.byteOffset,
                    bytes.byteOffset + bytes.byteLength,
                  )
            }, detectMimeTypeFromName(header.name) ?? ``),
          },
    { ...options, close: () => Promise.resolve() },
  )
