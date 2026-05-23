import {
  COMIC_INFO_FILENAME,
  parseComicInfo,
  resolveArchiveMetadata,
} from "@prose-reader/archive-parser"
import type { Manifest } from "@prose-reader/shared"
import { getArchiveHasComicInfo } from "../../../archives/archiveHasComicInfo"
import type { Archive } from "../../../archives/types"

const comicInfoFilenameLower = COMIC_INFO_FILENAME.toLowerCase()

export const comicInfo =
  ({ archive }: { archive: Archive; baseUrl: string }) =>
  async (manifest: Manifest): Promise<Manifest> => {
    const comicInfoFile = getArchiveHasComicInfo(archive)

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
    } satisfies Manifest

    const content = await comicInfoFile.string()

    try {
      const parsed = parseComicInfo(content)
      const resolved = resolveArchiveMetadata(parsed)

      return {
        ...manifestWithoutComicInfo,
        readingDirection:
          resolved.readingDirection ??
          manifestWithoutComicInfo.readingDirection,
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
