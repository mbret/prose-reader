import {
  detectMimeTypeFromName,
  Manifest,
  parseContentType,
} from "@prose-reader/shared"
import { Archive } from "../../../archives/types"
import { isArchiveEpub } from "../../../epubs/isArchiveEpub"

/**
 * If we don't have a regular epub, we have an archive that could be many things.
 * We try to refine the manifest based on the type of content as much as possible.
 */
export const nonEpub =
  ({ archive }: { archive: Archive; baseUrl: string }) =>
  async (manifest: Manifest): Promise<Manifest> => {
    const isEpub = isArchiveEpub(archive)

    if (isEpub) return manifest

    return {
      ...manifest,
      spineItems: manifest.spineItems.map((spineItem) => {
        const archiveItem = archive.files.find((item) =>
          decodeURI(spineItem.href).endsWith(item.uri),
        )

        const mimeType =
          parseContentType(archiveItem?.encodingFormat ?? "") ??
          detectMimeTypeFromName(archiveItem?.basename ?? "")

        return {
          ...spineItem,
          renditionLayout: mimeType?.startsWith(`image/`)
            ? `pre-paginated`
            : spineItem.renditionLayout,
        }
      }),
    }
  }
