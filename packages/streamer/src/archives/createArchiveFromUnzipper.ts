import { detectMimeTypeFromName } from "@prose-reader/shared"
import type { CentralDirectory } from "unzipper"
import { createArchiveFromEntries } from "./createArchiveFromEntries"
import { arrayBufferFileAccessors } from "./fileAccessors"
import type { Archive } from "./types"

export const createArchiveFromUnzipper = async (
  directory: CentralDirectory,
  options: {
    orderByAlpha?: boolean
    name?: string
    encodingFormat?: string
  } = {},
): Promise<Archive> =>
  createArchiveFromEntries(
    directory.files,
    (file) =>
      file.type === `Directory`
        ? { dir: true, uri: file.path }
        : {
            dir: false,
            uri: file.path,
            size: file.uncompressedSize,
            ...arrayBufferFileAccessors(async () => {
              const buffer = await file.buffer()
              // unzipper decodes into a regular Node `Buffer`, whose backing
              // store is always an `ArrayBuffer` (never a `SharedArrayBuffer`);
              // the cast only drops the `SharedArrayBuffer` arm that cannot
              // occur here.
              const backing = buffer.buffer as ArrayBuffer

              // Non-pooled (large) allocations own a dedicated, exactly-sized
              // backing buffer, so they can be handed out without copying.
              // Pooled small buffers share their backing store with other
              // entries and must be sliced out.
              return buffer.byteOffset === 0 &&
                buffer.byteLength === backing.byteLength
                ? backing
                : backing.slice(
                    buffer.byteOffset,
                    buffer.byteOffset + buffer.byteLength,
                  )
            }, detectMimeTypeFromName(file.path) ?? ``),
          },
    { ...options, close: () => Promise.resolve() },
  )
