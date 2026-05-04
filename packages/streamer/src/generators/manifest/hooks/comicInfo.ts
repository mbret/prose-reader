import {
  COMIC_INFO_FILENAME,
  parseComicInfo,
  resolveArchiveMetadata,
} from "@prose-reader/archive-parser"
import type { Manifest } from "@prose-reader/shared"
import type { Archive } from "../../../archives/types"

const comicInfoFilenameLower = COMIC_INFO_FILENAME.toLowerCase()

export const comicInfo =
  ({ archive }: { archive: Archive; baseUrl: string }) =>
  async (manifest: Manifest): Promise<Manifest> => {
    const comicInfoFile = archive.records.find(
      (file) =>
        file.basename.toLowerCase() === comicInfoFilenameLower && !file.dir,
    )

    if (!comicInfoFile || comicInfoFile.dir) {
      return manifest
    }

    const manifestWithoutComicInfo = {
      ...manifest,
      spineItems: manifest.spineItems
        .filter(
          (item) => !item.id.toLowerCase().endsWith(comicInfoFilenameLower),
        )
        .map((item, _, items) => ({
          ...item,
          progressionWeight: 1 / items.length,
        })),
    }

    const content = await comicInfoFile.string()

    try {
      const parsed = parseComicInfo(content)
      const resolved = resolveArchiveMetadata(parsed)

      return {
        ...manifestWithoutComicInfo,
        readingDirection: resolved.readingDirection ?? `ltr`,
      }
    } catch (e) {
      console.error(
        `Unable to parse ${COMIC_INFO_FILENAME} for content\n`,
        content,
      )
      console.error(e)

      return manifestWithoutComicInfo
    }
  }
