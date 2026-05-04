import {
  APPLE_IBOOKS_DISPLAY_OPTIONS_FILENAME,
  parseAppleDisplayOptionsXml,
  resolveArchiveMetadata,
} from "@prose-reader/archive-parser"
import type { Manifest } from "@prose-reader/shared"
import type { Archive } from "../../../archives/types"

const appleDisplayOptionsBasename =
  APPLE_IBOOKS_DISPLAY_OPTIONS_FILENAME.toLowerCase()

export const apple =
  ({ archive }: { archive: Archive; baseUrl: string }) =>
  async (manifest: Manifest): Promise<Manifest> => {
    const infoFile = archive.records.find(
      (file) =>
        !file.dir &&
        file.basename.toLowerCase() === appleDisplayOptionsBasename,
    )

    if (!infoFile || infoFile.dir) {
      return manifest
    }

    const content = await infoFile.string()

    try {
      const parsed = parseAppleDisplayOptionsXml(content)
      const { renditionLayout } = resolveArchiveMetadata(parsed)

      return {
        ...manifest,
        renditionLayout: manifest.renditionLayout ?? renditionLayout,
      }
    } catch (e) {
      console.error(
        `Unable to parse ${APPLE_IBOOKS_DISPLAY_OPTIONS_FILENAME} for content\n`,
        content,
      )
      console.error(e)

      return manifest
    }
  }
