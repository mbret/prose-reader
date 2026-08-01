import { sortByTitleComparator } from "@prose-reader/shared"
import type { Archive } from "../archives/types.ts"
import type { ArchiveTocItem } from "./types.ts"

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
    containerHref: string,
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
            // combineWith returns the full merged children list already
            contents: combineWith(
              foundEntry.contents,
              nextFolderCursor,
              nextSubFolders,
              containerHref,
              path,
            ),
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
            containerHref,
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
            containerHref,
            path,
          ),
          containerHref,
          path,
          title: folder,
        },
      ]
    }

    return [
      ...toc,
      {
        contents: [],
        containerHref,
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

    // encodeURI leaves `#` and `?` untouched (reserved URI delimiters), but in
    // a raw archive filename they are data and would otherwise be parsed as
    // fragment/query once joined onto a base URL.
    const containerHref = encodeURI(file.uri)
      .replace(/#/g, `%23`)
      .replace(/\?/g, `%3F`)
      .replace(/\/$/, "")
    const path = file.uri.replace(/\/$/, "")

    return combineWith(acc, firstFolder, restFolders, containerHref, path)
  }, [])
}
