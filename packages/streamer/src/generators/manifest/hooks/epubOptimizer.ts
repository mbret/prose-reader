import { type Manifest, isXmlBasedMimeType } from "@prose-reader/shared"
import { XmlDocument } from "xmldoc"
import type { Archive } from "../../../archives/types"
import { getSpineItemFilesFromArchive } from "../../../epubs/getSpineItemFilesFromArchive"

const hasDocMetaViewport = (doc: XmlDocument) => {
  const metaElm = doc
    .descendantWithPath("head")
    ?.childrenNamed("meta")
    .find((node) => node.attr.name === "viewport")

  return !!(metaElm && metaElm.attr.name === "viewport")
}

const allFilesHaveViewportMeta = (files: Archive["records"]) =>
  files.reduce(async (result, current) => {
    const _result = await result

    if (!_result) return false

    if (
      !isXmlBasedMimeType({
        mimeType: current.encodingFormat,
        uri: current.uri,
      })
    ) {
      return false
    }

    const file = current.dir ? null : await current.string()

    if (!file) return false

    return hasDocMetaViewport(new XmlDocument(file))
  }, Promise.resolve(true))

export const epubOptimizerHook =
  ({ archive }: { archive: Archive; baseUrl: string }) =>
  async (manifest: Manifest): Promise<Manifest> => {
    const bookIsFullReflowable =
      manifest.renditionLayout === "reflowable" &&
      manifest.spineItems.every((item) => item.renditionLayout === "reflowable")

    if (bookIsFullReflowable) {
      const files = await getSpineItemFilesFromArchive({ archive })

      const hasAllViewport = await allFilesHaveViewportMeta(files)

      if (hasAllViewport) {
        return {
          ...manifest,
          spineItems: manifest.spineItems.map((item) => ({
            ...item,
            renditionLayout: "pre-paginated",
          })),
          renditionLayout: "pre-paginated",
        }
      }
    }

    return manifest
  }
