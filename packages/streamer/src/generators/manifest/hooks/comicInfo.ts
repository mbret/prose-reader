import { Manifest } from "@prose-reader/shared"
import xmldoc from "xmldoc"
import { Archive } from "../../../archives/types"

/**
 * Handle archive which contains ComicInfo.xml. This is a meta file
 * used to define cbz, etc. I believe it comes from some sites or apps.
 */
export const comicInfoHook =
  ({ archive }: { archive: Archive; baseUrl: string }) =>
  async (manifest: Manifest): Promise<Manifest> => {
    const comicInfoFile = archive.files.find((file) => file.basename.toLowerCase() === `comicinfo.xml`)

    if (!comicInfoFile) {
      return manifest
    }

    const manifestWithoutComicInfo = {
      ...manifest,
      spineItems: manifest.spineItems.filter((item) => item.id.toLowerCase() !== `comicinfo.xml`),
    }

    // @todo handle more meta
    const content = await comicInfoFile.string()

    try {
      const xmlDoc = new xmldoc.XmlDocument(content)

      const mangaVal = (xmlDoc.childNamed(`Manga`)?.val as `YesAndRightToLeft`) || `unknown`

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
