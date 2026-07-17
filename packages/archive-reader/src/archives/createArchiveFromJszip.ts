import type JSZip from "jszip"
import { createArchiveFromEntries } from "./createArchiveFromEntries"
import type { Archive } from "./types"

export const createArchiveFromJszip = async (
  jszip: JSZip,
  options: {
    orderByAlpha?: boolean
    name?: string
    encodingFormat?: string
  } = {},
): Promise<Archive> =>
  createArchiveFromEntries(
    Object.values(jszip.files),
    (file) =>
      file.dir
        ? { dir: true, uri: file.name }
        : {
            dir: false,
            uri: file.name,
            // `_data.uncompressedSize` is private API
            // @ts-expect-error
            size: file._data.uncompressedSize,
            blob: () => file.async(`blob`),
            arrayBuffer: () => file.async(`arraybuffer`),
          },
    { ...options, close: () => Promise.resolve() },
  )
