import type { Manifest } from "@prose-reader/shared"
import { XmlDocument } from "xmldoc"
import type { Archive } from "../../../archives/types"

export const kobo =
  ({ archive }: { archive: Archive; baseUrl: string }) =>
  async (manifest: Manifest): Promise<Manifest> => {
    const comicInfoFile = archive.records.find(
      (file) => file.basename.toLowerCase() === `comicinfo.xml` && !file.dir,
    )

    if (!comicInfoFile || comicInfoFile.dir) {
      return manifest
    }

    const manifestWithoutComicInfo = {
      ...manifest,
      spineItems: manifest.spineItems
        .filter((item) => !item.id.toLowerCase().endsWith(`comicinfo.xml`))
        .map((item, _, items) => ({
          ...item,
          progressionWeight: 1 / items.length,
        })),
    }

    // @todo handle more meta
    const content = await comicInfoFile.string()

    try {
      const xmlDoc = new XmlDocument(content)

      const mangaVal =
        (xmlDoc.childNamed(`Manga`)?.val as `YesAndRightToLeft`) || `unknown`

      return {
        ...manifestWithoutComicInfo,
        readingDirection: mangaVal === `YesAndRightToLeft` ? `rtl` : `ltr`,
      }
    } catch (e) {
      console.error("Unable to parse comicinfo.xml for content\n", content)
      console.error(e)

      return manifestWithoutComicInfo
    }
  }
