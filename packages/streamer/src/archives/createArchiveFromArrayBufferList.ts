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
    records: files.map((file) => ({
      dir: file.isDir,
      basename: getUriBasename(file.name),
      uri: file.name,
      blob: async () => new Blob([await file.data()]),
      string: async () => {
        const data = await file.data()
        return String.fromCharCode.apply(
          null,
          Array.from(new Uint16Array(data)),
        )
      },
      size: file.size,
    })),
    close: () => Promise.resolve(),
  }
}
