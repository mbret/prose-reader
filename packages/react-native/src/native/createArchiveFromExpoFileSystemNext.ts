import {
  type Archive,
  blobFileAccessors,
  createArchiveFromEntries,
} from "@prose-reader/archive-reader"
import { Directory, type File } from "expo-file-system"

const listDeep = (directory: Directory): (Directory | File)[] =>
  directory
    .list()
    .flatMap((entry) =>
      entry instanceof Directory ? [entry, ...listDeep(entry)] : [entry],
    )

export const createArchiveFromExpoFileSystemNext = async (
  directory: Directory,
  { orderByAlpha, name }: { orderByAlpha?: boolean; name?: string } = {},
): Promise<Archive> =>
  createArchiveFromEntries(
    listDeep(directory),
    (entry) => {
      const uri = entry.uri.replace("file://", "") // @todo fix prose-reader

      if (entry instanceof Directory) {
        return { dir: true, uri }
      }

      return {
        dir: false,
        uri,
        size: entry.info().size ?? 0,
        ...blobFileAccessors(async () => new Blob([await entry.arrayBuffer()])),
      }
    },
    { orderByAlpha, name, close: () => Promise.resolve() },
  )
