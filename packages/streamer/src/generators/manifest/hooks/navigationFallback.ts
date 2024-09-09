import { Manifest, TocItem, urlJoin } from "@prose-reader/shared"
import { Archive } from "../../../archives/types"
import { sortByTitleComparator } from "../../../utils/sortByTitleComparator"

/**
 * In case no navigation was generated prior to this hook, we will try
 * to generate something based on the structure of the archive.
 *
 * We use folders as chapters.
 */
export const navigationFallbackHook =
  ({ archive, baseUrl }: { archive: Archive; baseUrl: string }) =>
  async (manifest: Manifest): Promise<Manifest> => {
    if (manifest.nav) return manifest

    const filesSortedByAlpha = [...archive.files].sort((a, b) =>
      sortByTitleComparator(a.uri, b.uri),
    )

    const filesSortedAlpha = Object.values(filesSortedByAlpha)

    const combineWith = (
      toc: TocItem[],
      folder: string,
      subFolders: string[],
      href: string,
      path: string,
    ): TocItem[] => {
      const foundEntry = toc.find((entry) => entry.title === folder)
      const [nextFolderCursor, ...nextSubFolders] = subFolders

      if (foundEntry) {
        if (nextFolderCursor) {
          return [
            ...toc.filter((entry) => entry != foundEntry),
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
            } satisfies TocItem,
          ]
        }

        // we have an exact match for current folder
        // try to see if the path is better than previously registered
        const previousRegisteredPathWasLonger =
          foundEntry.path.split("/").length > path.split("/").length

        if (previousRegisteredPathWasLonger) {
          return [
            ...toc.filter((entry) => entry != foundEntry),
            {
              ...foundEntry,
              path,
              href,
            } satisfies TocItem,
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

    const toc: NonNullable<Manifest["nav"]>["toc"] = filesSortedAlpha.reduce(
      (acc, file) => {
        if (file.dir) return acc

        const parts = file.uri.split("/")

        // we have a file that is
        const folders = parts.slice(0, -1)
        const [firstFolder, ...restFolders] = folders

        if (firstFolder) {
          const href = urlJoin(baseUrl, encodeURI(file.uri)).replace(/\/$/, "")
          const path = file.uri.replace(/\/$/, "")

          return combineWith(acc, firstFolder, restFolders, href, path)
        }

        return acc
      },
      [] as NonNullable<Manifest["nav"]>["toc"],
    )

    if (toc.length === 0) return manifest

    return {
      ...manifest,
      nav: {
        toc,
      },
    }
  }
