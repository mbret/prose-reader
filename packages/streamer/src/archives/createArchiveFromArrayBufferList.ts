import { sortByTitleComparator } from "../utils/sortByTitleComparator"
import { getUriBasename } from "../utils/uri"
import { Archive } from "./types"

export const createArchiveFromArrayBufferList = async (
  list: {
    isDir: boolean
    name: string
    size: number
    data: () => Promise<ArrayBuffer>
  }[],
  { orderByAlpha, name }: { orderByAlpha?: boolean; name?: string } = {}
): Promise<Archive> => {
  let files = list

  if (orderByAlpha) {
    files = files.sort((a, b) => sortByTitleComparator(a.name, b.name))
  }

  return {
    filename: name || ``,
    files: files.map((file) => ({
      dir: file.isDir,
      basename: getUriBasename(file.name),
      uri: file.name,
      blob: async () => new Blob([await file.data()]),
      string: async () => {
        const data = await file.data()
        return String.fromCharCode.apply(
          null,
          Array.from(new Uint16Array(data))
        )
      },
      base64: async () => {
        // @todo not used for now, lets implement it later if needed
        return ``
      },
      size: file.size,
    })),
  }
}
