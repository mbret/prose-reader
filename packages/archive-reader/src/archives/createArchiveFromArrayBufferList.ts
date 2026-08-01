import { detectMimeTypeFromName } from "@prose-reader/shared"
import { createArchiveFromEntries } from "./createArchiveFromEntries.ts"
import { arrayBufferFileAccessors } from "./fileAccessors.ts"
import type { Archive } from "./types.ts"

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
