import { Manifest, urlJoin } from "@prose-reader/shared"
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

    const filesSortedByAlpha = [...archive.files].sort((a, b) => sortByTitleComparator(a.uri, b.uri))

    const toc: NonNullable<Manifest["nav"]>["toc"] = Object.values(filesSortedByAlpha).reduce(
      (acc, file) => {
        const parts = file.uri.split("/")

        // we have a file that is
        const isFileUnderFolder = !file.dir && parts.length > 1

        if (isFileUnderFolder) {
          parts.forEach((part, level) => {
            const partIsFileName = level === parts.length - 1

            if (partIsFileName) return

            const existingTocItem = acc.find(({ title }) => title === part)

            if (existingTocItem) {
              // @todo
            } else {
              acc.push({
                contents: [],
                href: urlJoin(baseUrl, encodeURI(file.uri)).replace(/\/$/, ""),
                path: file.uri.replace(/\/$/, ""),
                title: parts[0] ?? "",
              })
            }
          })
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
