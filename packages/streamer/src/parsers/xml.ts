import { XmlTextNode } from "xmldoc"

import { XmlElement } from "xmldoc"

export const getXmlElementInnerText = (
  node: XmlElement | undefined,
): string => {
  if (!node) return ""

  return node.children
    .map((child) => {
      if (child instanceof XmlTextNode) return child.text
      if (child instanceof XmlElement) return getXmlElementInnerText(child)
      return ""
    })
    .join("")
    .trim()
}
