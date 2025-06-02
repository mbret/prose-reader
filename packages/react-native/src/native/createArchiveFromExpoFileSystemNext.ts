import {
  type Archive,
  getUriBasename,
  sortByTitleComparator,
} from "@prose-reader/streamer"
import { Directory, type File } from "expo-file-system/next"

export const createArchiveFromExpoFileSystemNext = async (
  directory: Directory,
  { orderByAlpha, name }: { orderByAlpha?: boolean; name?: string } = {},
): Promise<Archive> => {
  let files = directory.list()

  if (orderByAlpha) {
    files = files.slice().sort((a, b) => sortByTitleComparator(a.name, b.name))
  }

  const listOneLevelRecords = (directory: Directory): (Directory | File)[] => {
    return directory.list().reduce((acc: (Directory | File)[], file) => {
      if (file instanceof Directory) {
        return [...acc, ...listOneLevelRecords(file)]
      }

      return [...acc, file]
    }, [])
  }

  const flatList = files.reduce((acc: (Directory | File)[], file) => {
    if (file instanceof Directory) {
      return [...acc, ...listOneLevelRecords(file)]
    }

    return [...acc, file]
  }, [])

  const archive: Archive = {
    filename: name || ``,
    records: flatList.map((record) => {
      if (record instanceof Directory) {
        return {
          dir: true,
          basename: getUriBasename(record.name),
          uri: record.uri.replace("file://", ""), // @todo fix prose-reader
          blob: () => Promise.resolve(new Blob()),
          string: () => Promise.resolve(``),
          size: 0,
        }
      }

      return {
        dir: false,
        basename: getUriBasename(record.name),
        uri: record.uri.replace("file://", ""), // @todo fix prose-reader
        blob: async () => record.blob(),
        string: async () => record.text(),
        size: record.bytes().length,
        encodingFormat: record.type ?? undefined,
      }
    }),
    close: () => Promise.resolve(),
  }

  return archive
}
