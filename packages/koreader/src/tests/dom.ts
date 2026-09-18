import { isTextNode } from "../crengine/children"

/**
 * Test helpers: spine item documents parsed the way prose renders them (XML).
 */
export const parseXhtml = (source: string): Document => {
  const document = new DOMParser().parseFromString(
    source,
    "application/xhtml+xml",
  )
  const error = document.getElementsByTagName("parsererror")[0]

  if (error) throw new Error(`XHTML parse error: ${error.textContent}`)

  return document
}

/** A spine item document whose `<body>` holds `body`. */
export const documentWithBody = (body: string): Document =>
  parseXhtml(
    `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>test</title></head><body>${body}</body></html>`,
  )

export const parseSvgDocument = (source: string): Document =>
  new DOMParser().parseFromString(source, "image/svg+xml")

/** The text node `#id > childNodes[childIndex]`, throwing when it is not one. */
export const textNodeOf = (
  document: Document,
  id: string,
  childIndex = 0,
): Text => {
  const element = document.getElementById(id)
  const node = element?.childNodes[childIndex]

  if (!node || !isTextNode(node))
    throw new Error(`no text node at ${id} > ${childIndex}`)

  return node
}

export const elementOf = (document: Document, id: string): Element => {
  const element = document.getElementById(id)

  if (!element) throw new Error(`no element #${id}`)

  return element
}

/** Text between two positions, as a DOM Range gives it. */
export const rangeText = (
  start: { node: Node; offset?: number },
  end: { node: Node; offset?: number },
): string => {
  const document = start.node.ownerDocument

  if (!document) throw new Error("detached node")

  // jsdom cannot place a Range inside a CDATA section; slice the data instead
  if (
    start.node === end.node &&
    (start.node.nodeType === 3 || start.node.nodeType === 4)
  ) {
    return (start.node.textContent ?? "").slice(
      start.offset ?? 0,
      end.offset ?? 0,
    )
  }

  const range = document.createRange()

  range.setStart(start.node, start.offset ?? 0)
  range.setEnd(end.node, end.offset ?? 0)

  return range.toString()
}

/** The child at `index`, which the test markup guarantees exists. */
export const childOf = (parent: Node, index: number): Node => {
  const child = parent.childNodes[index]

  if (!child) throw new Error(`no child ${index} in ${parent.nodeName}`)

  return child
}

export const lastChildOf = (parent: Node): Node => {
  const child = parent.lastChild

  if (!child) throw new Error(`no child in ${parent.nodeName}`)

  return child
}

export const firstElementChildOf = (parent: Element): Element => {
  const child = parent.firstElementChild

  if (!child) throw new Error(`no element child in ${parent.nodeName}`)

  return child
}
