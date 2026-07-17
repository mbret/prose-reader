import { sortByTitleComparator } from "@prose-reader/shared"
import type { Archive } from "../archives/types"
import type { ArchiveTocItem } from "./types"

/**
 * Derive a TOC from the folder hierarchy of the archive (e.g. a CBZ with one
 * folder per chapter). Each folder becomes an entry pointing to its first
 * file in natural sort order.
 */
export const buildTocFromFolders = (archive: Archive): ArchiveTocItem[] => {
  const filesSortedByAlpha = [...archive.records].sort((a, b) =>
    sortByTitleComparator(a.uri, b.uri),
  )

  const combineWith = (
    toc: ArchiveTocItem[],
    folder: string,
    subFolders: string[],
    href: string,
    path: string,
  ): ArchiveTocItem[] => {
    const foundEntry = toc.find((entry) => entry.title === folder)
    const [nextFolderCursor, ...nextSubFolders] = subFolders

    if (foundEntry) {
      if (nextFolderCursor) {
        return [
          ...toc.filter((entry) => entry !== foundEntry),
          {
            ...foundEntry,
            contents: [
              ...foundEntry.contents,
              ...combineWith(
                foundEntry.contents,
                nextFolderCursor,
                nextSubFolders,
                href,
                path,
              ),
            ],
          } satisfies ArchiveTocItem,
        ]
      }

      const previousRegisteredPathWasLonger =
        foundEntry.path.split("/").length > path.split("/").length

      if (previousRegisteredPathWasLonger) {
        return [
          ...toc.filter((entry) => entry !== foundEntry),
          {
            ...foundEntry,
            path,
            href,
          } satisfies ArchiveTocItem,
        ]
      }

      return toc
    }

    if (nextFolderCursor) {
      return [
        ...toc,
        {
          contents: combineWith(
            [],
            nextFolderCursor,
            nextSubFolders,
            href,
            path,
          ),
          href,
          path,
          title: folder,
        },
      ]
    }

    return [
      ...toc,
      {
        contents: [],
        href,
        path,
        title: folder,
      },
    ]
  }

  return filesSortedByAlpha.reduce<ArchiveTocItem[]>((acc, file) => {
    if (file.dir) return acc

    const folders = file.uri.split("/").slice(0, -1)
    const [firstFolder, ...restFolders] = folders

    if (!firstFolder) return acc

    const href = encodeURI(file.uri).replace(/\/$/, "")
    const path = file.uri.replace(/\/$/, "")

    return combineWith(acc, firstFolder, restFolders, href, path)
  }, [])
}
