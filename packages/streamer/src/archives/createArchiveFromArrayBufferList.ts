import { detectMimeTypeFromName } from "@prose-reader/shared"
import { sortByTitleComparator } from "../utils/sortByTitleComparator"
import { getUriBasename } from "../utils/uri"
import type { Archive } from "./types"

export const createArchiveFromArrayBufferList = async (
  list: {
    isDir: boolean
    name: string
    size: number
    data: () => Promise<ArrayBuffer>
  }[],
  { orderByAlpha, name }: { orderByAlpha?: boolean; name?: string } = {},
): Promise<Archive> => {
  let files = list

  if (orderByAlpha) {
    files = files.slice().sort((a, b) => sortByTitleComparator(a.name, b.name))
  }

  return {
    filename: name || ``,
    records: files.map((file) => {
      const size = file.size
      const basename = getUriBasename(file.name)

      if (file.isDir) {
        return {
          dir: true,
          basename,
          uri: file.name,
          size,
        }
      }

      return {
        dir: file.isDir,
        basename,
        encodingFormat: detectMimeTypeFromName(file.name),
        uri: file.name,
        blob: async () =>
          new Blob([await file.data()], {
            type: detectMimeTypeFromName(file.name) ?? ``,
          }),
        string: async () => {
          const data = await file.data()
          return String.fromCharCode.apply(
            null,
            Array.from(new Uint16Array(data)),
          )
        },
        size,
      }
    }),
    close: () => Promise.resolve(),
  }
}
