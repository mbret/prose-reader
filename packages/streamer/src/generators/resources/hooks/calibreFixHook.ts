import { XmlDocument } from "xmldoc"
import { createTextResourceHook } from "./createTextResourceHook"

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

export const calibreFixHook = createTextResourceHook(
  ".xhtml",
  (bodyToParse) => {
    const opfXmlDoc = new XmlDocument(bodyToParse)

    if (!hasCalibreCoverMeta(opfXmlDoc)) {
      return undefined
    }

    const buggySvg = getBuggyCoverSvg(opfXmlDoc)

    if (buggySvg) {
      delete buggySvg.attr.preserveAspectRatio
    }

    return opfXmlDoc.toString()
  },
)
