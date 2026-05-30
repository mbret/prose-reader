import {
  type Archive,
  blobFileAccessors,
  createArchive,
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

  const archive = createArchive({
    filename: name,
    records: flatList.map((record) => {
      if (record instanceof Directory) {
        return {
          dir: true,
          basename: getUriBasename(record.name),
          uri: record.uri.replace("file://", ""), // @todo fix prose-reader
        }
      }

      return {
        dir: false,
        basename: getUriBasename(record.name),
        uri: record.uri.replace("file://", ""), // @todo fix prose-reader
        size: record.info().size ?? 0,
        encodingFormat: record.type ?? undefined,
        ...blobFileAccessors(
          async () => new Blob([await record.arrayBuffer()]),
        ),
      }
    }),
    close: () => Promise.resolve(),
  })

  return archive
}
