import {
  type Archive,
  isArchiveEpub,
  isFileRecord,
} from "@prose-reader/archive-reader"
import {
  detectMimeTypeFromName,
  isMediaContentMimeType,
  type Manifest,
  parseContentType,
} from "@prose-reader/shared"

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
        const archiveItem = archive.records.find((item) =>
          decodeURI(spineItem.href).endsWith(item.uri),
        )

        const archiveItemEncodingFormat =
          archiveItem && isFileRecord(archiveItem)
            ? archiveItem.encodingFormat
            : undefined

        const mimeType =
          parseContentType(archiveItemEncodingFormat ?? "") ||
          detectMimeTypeFromName(archiveItem?.basename ?? "")

        return {
          ...spineItem,
          renditionLayout:
            mimeType && isMediaContentMimeType(mimeType)
              ? `pre-paginated`
              : spineItem.renditionLayout,
        }
      }),
    }
  }
