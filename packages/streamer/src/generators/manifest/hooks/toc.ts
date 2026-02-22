import { type Manifest, urlJoin } from "@prose-reader/shared"
import { XmlDocument } from "xmldoc"
import type { Archive } from "../../../archives/types"
import { getArchiveOpfInfo } from "../../../epubs/getArchiveOpfInfo"
import { parseToc } from "../../../parsers/nav"
import { sortByTitleComparator } from "../../../utils/sortByTitleComparator"

type Toc = NonNullable<Manifest["nav"]>["toc"]
type TocItem = NonNullable<Manifest["nav"]>["toc"][number]

const buildFolderFallbackToc = (
  archive: Archive,
  { baseUrl }: { baseUrl: string },
): Toc => {
  const filesSortedByAlpha = [...archive.records].sort((a, b) =>
    sortByTitleComparator(a.uri, b.uri),
  )

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
          } satisfies TocItem,
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

  return filesSortedByAlpha.reduce((acc, file) => {
    if (file.dir) return acc

    const folders = file.uri.split("/").slice(0, -1)
    const [firstFolder, ...restFolders] = folders

    if (!firstFolder) return acc

    const href = urlJoin(baseUrl, encodeURI(file.uri)).replace(/\/$/, "")
    const path = file.uri.replace(/\/$/, "")

    return combineWith(acc, firstFolder, restFolders, href, path)
  }, [] as Toc)
}

const resolveTocFromArchive = async (
  archive: Archive,
  { baseUrl }: { baseUrl: string },
): Promise<Toc | undefined> => {
  const { data: opfFile } = getArchiveOpfInfo(archive) || {}

  if (opfFile && !opfFile.dir) {
    const opfXmlDoc = new XmlDocument(await opfFile.string())
    const toc = await parseToc(opfXmlDoc, archive, { baseUrl })

    // Keep explicit empty TOC for EPUB-like inputs even when there is no nav file.
    return toc || []
  }

  const toc = buildFolderFallbackToc(archive, { baseUrl })

  if (toc.length === 0) {
    return undefined
  }

  return toc
}

/**
 * Resolve the table of contents from a single entry point.
 * Internally handles EPUB nav, NCX, and folder fallback.
 */
export const tocHook =
  ({ archive, baseUrl }: { archive: Archive; baseUrl: string }) =>
  async (manifest: Manifest): Promise<Manifest> => {
    if (manifest.nav) return manifest

    const toc = await resolveTocFromArchive(archive, { baseUrl })
    if (!toc) return manifest

    return {
      ...manifest,
      nav: {
        toc,
      },
    }
  }
