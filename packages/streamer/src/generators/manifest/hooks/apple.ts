import type { Manifest } from "@prose-reader/shared"
import { XmlDocument } from "xmldoc"
import type { Archive } from "../../../archives/types"

export const apple =
  ({ archive }: { archive: Archive; baseUrl: string }) =>
  async (manifest: Manifest): Promise<Manifest> => {
    const infoFile = archive.files.find(
      (file) =>
        file.basename.toLowerCase() === `com.apple.ibooks.display-options.xml`,
    )

    if (!infoFile) {
      return manifest
    }

    const content = await (await infoFile.blob()).text()

    try {
      const xmlDoc = new XmlDocument(content)
      const platformElement = xmlDoc.childNamed(`platform`)
      const fixedLayoutOption =
        platformElement
          ?.childrenNamed("option")
          ?.find((option) => option.attr.name === "fixed-layout")?.val ||
        "false"

      return {
        ...manifest,
        renditionLayout:
          fixedLayoutOption === `true`
            ? `pre-paginated`
            : manifest.renditionLayout,
      }
    } catch (e) {
      console.error(
        "Unable to parse com.apple.ibooks.display-options.xml for content\n",
        content,
      )
      console.error(e)

      return manifest
    }
  }
