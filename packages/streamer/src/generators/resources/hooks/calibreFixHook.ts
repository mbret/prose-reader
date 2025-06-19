import { XmlDocument } from "xmldoc"
import type { Archive } from "../../../archives/types"
import type { HookResource } from "./types"

const hasCalibreCoverMeta = (doc: XmlDocument) => {
  const metaElm = doc
    .descendantWithPath("head")
    ?.childrenNamed("meta")
    .find((node) => node.attr.name === "calibre:cover")

  return !!(metaElm && metaElm.attr.name === "calibre:cover")
}

const getBuggyCoverSvg = (doc: XmlDocument) => {
  return doc
    .descendantWithPath("body")
    ?.descendantWithPath("div")
    ?.childrenNamed("svg")
    ?.find(
      (node) =>
        node.attr.width === "100%" && node.attr.preserveAspectRatio === "none",
    )
}

const fixBuggyCover =
  ({ archive, resourcePath }: { archive: Archive; resourcePath: string }) =>
  async (resource: HookResource): Promise<HookResource> => {
    const file = Object.values(archive.records).find(
      (file) => file.uri === resourcePath && !file.dir,
    )

    if (file && !file.dir && file.basename.endsWith(`.xhtml`)) {
      const bodyToParse = resource.body ?? (await file.string())

      const opfXmlDoc = new XmlDocument(bodyToParse)

      if (hasCalibreCoverMeta(opfXmlDoc)) {
        const buggySvg = getBuggyCoverSvg(opfXmlDoc)

        if (buggySvg) {
          // biome-ignore lint/performance/noDelete: TODO
          delete buggySvg.attr.preserveAspectRatio
        }

        return {
          ...resource,
          body: opfXmlDoc?.toString(),
        }
      }
    }

    return resource
  }

export const calibreFixHook =
  ({ archive, resourcePath }: { archive: Archive; resourcePath: string }) =>
  async (resource: HookResource): Promise<HookResource> => {
    return fixBuggyCover({ archive, resourcePath })(resource)
  }
