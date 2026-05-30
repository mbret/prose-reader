import { detectMimeTypeFromName } from "@prose-reader/shared"
import { sortByTitleComparator } from "../utils/sortByTitleComparator"
import { getUriBasename } from "../utils/uri"
import { createArchive } from "./createArchive"
import { arrayBufferFileAccessors } from "./fileAccessors"
import type { Archive } from "./types"

export const createArchiveFromArrayBufferList = async (
  list: {
    isDir: boolean
    name: string
    size: number
    data: () => Promise<ArrayBuffer>
  }[],
  {
    orderByAlpha,
    name,
    encodingFormat,
  }: { orderByAlpha?: boolean; name?: string; encodingFormat?: string } = {},
): Promise<Archive> => {
  let files = list

  if (orderByAlpha) {
    files = files.slice().sort((a, b) => sortByTitleComparator(a.name, b.name))
  }

  return createArchive({
    filename: name,
    encodingFormat,
    records: files.map((file) => {
      const basename = getUriBasename(file.name)

      if (file.isDir) {
        return {
          dir: true,
          basename,
          uri: file.name,
        }
      }

      return {
        dir: file.isDir,
        basename,
        encodingFormat: detectMimeTypeFromName(file.name),
        uri: file.name,
        size: file.size,
        ...arrayBufferFileAccessors(
          file.data,
          detectMimeTypeFromName(file.name) ?? ``,
        ),
      }
    }),
    close: () => Promise.resolve(),
  })
}
