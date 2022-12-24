import { Manifest } from "@prose-reader/shared"
import xmldoc from "xmldoc"
import { Archive } from "../../../archives/types"

/**
 * Handle archive which contains ComicInfo.xml. This is a meta file
 * used to define cbz, etc. I believe it comes from some sites or apps.
 */
export const comicInfoHook =
  ({ archive, baseUrl }: { archive: Archive; baseUrl: string }) =>
  async (manifest: Manifest): Promise<Manifest> => {
    const comicInfoFile = archive.files.find((file) => file.basename.toLowerCase() === `comicinfo.xml`)

    if (!comicInfoFile) {
      return manifest
    }

    // @todo handle more meta
    const content = await comicInfoFile.string()
    const xmlDoc = new xmldoc.XmlDocument(content)

    const mangaVal = (xmlDoc.childNamed(`Manga`)?.val as `YesAndRightToLeft`) || `unknown`

    return {
      ...manifest,
      spineItems: manifest.spineItems.filter((item) => item.id.toLowerCase() !== `comicinfo.xml`),
      readingDirection: mangaVal === `YesAndRightToLeft` ? `rtl` : `ltr`
    }
  }
