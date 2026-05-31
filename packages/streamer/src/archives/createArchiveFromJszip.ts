import { detectMimeTypeFromName } from "@prose-reader/shared"
import type JSZip from "jszip"
import { sortByTitleComparator } from "../utils/sortByTitleComparator"
import { getUriBasename } from "../utils/uri"
import { createArchive } from "./createArchive"
import type { Archive } from "./types"

export const createArchiveFromJszip = async (
  jszip: JSZip,
  {
    orderByAlpha,
    name,
    encodingFormat,
  }: { orderByAlpha?: boolean; name?: string; encodingFormat?: string } = {},
): Promise<Archive> => {
  let files = Object.values(jszip.files)

  if (orderByAlpha) {
    files = files.slice().sort((a, b) => sortByTitleComparator(a.name, b.name))
  }

  return createArchive({
    filename: name,
    encodingFormat,
    records: files.map((file) => {
      const basename = getUriBasename(file.name)

      if (file.dir) {
        return {
          dir: true,
          basename,
          uri: file.name,
        }
      }

      return {
        dir: false,
        basename: getUriBasename(file.name),
        uri: file.name,
        encodingFormat: detectMimeTypeFromName(file.name),
        blob: () => file.async(`blob`),
        arrayBuffer: () => file.async(`arraybuffer`),
        // this is private API
        // @ts-expect-error
        size: file._data.uncompressedSize,
      }
    }),
    close: () => Promise.resolve(),
  })
}
