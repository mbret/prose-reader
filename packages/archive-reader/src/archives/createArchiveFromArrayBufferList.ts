import { detectMimeTypeFromName } from "@prose-reader/shared"
import { createArchiveFromEntries } from "./createArchiveFromEntries"
import { arrayBufferFileAccessors } from "./fileAccessors"
import type { Archive } from "./types"

export const createArchiveFromArrayBufferList = async (
  list: {
    isDir: boolean
    name: string
    size: number
    data: () => Promise<ArrayBuffer>
  }[],
  options: {
    orderByAlpha?: boolean
    name?: string
    encodingFormat?: string
  } = {},
): Promise<Archive> =>
  createArchiveFromEntries(
    list,
    (file) =>
      file.isDir
        ? { dir: true, uri: file.name }
        : {
            dir: false,
            uri: file.name,
            size: file.size,
            ...arrayBufferFileAccessors(
              file.data,
              detectMimeTypeFromName(file.name) ?? ``,
            ),
          },
    { ...options, close: () => Promise.resolve() },
  )
