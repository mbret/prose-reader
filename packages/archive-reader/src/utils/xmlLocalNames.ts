import type { XmlElement, XmlNodeBase } from "xmldoc"

/** An element's name without its namespace prefix. */
export const elementLocalName = (name: string): string =>
  name.includes(":") ? name.slice(name.lastIndexOf(":") + 1) : name

export const localNameEq = (elementName: string, wantLocal: string): boolean =>
  elementLocalName(elementName).toLowerCase() === wantLocal.toLowerCase()

export const isXmlElement = (node: XmlNodeBase): node is XmlElement =>
  node.type === "element"

/**
 * The first child element of a local name, ASCII case-insensitively and
 * whatever prefix it carries: books in the wild prefix their elements, or
 * not, whatever the namespace declarations say.
 */
export const childNamedLocal = (
  parent: XmlElement,
  localName: string,
): XmlElement | undefined => {
  for (const node of parent.children) {
    if (!isXmlElement(node)) continue
    if (localNameEq(node.name, localName)) return node
  }
  return undefined
}

/** Every child element of a local name, as {@link childNamedLocal} matches. */
export const childrenNamedLocal = (
  parent: XmlElement,
  localName: string,
): XmlElement[] => {
  const out: XmlElement[] = []
  for (const node of parent.children) {
    if (!isXmlElement(node)) continue
    if (localNameEq(node.name, localName)) out.push(node)
  }
  return out
}
