import { Report } from "../report.ts"

export function setAttributeIfChanged(
  element: Element,
  name: string,
  value: string | number | boolean,
): void {
  const nextValue = String(value)

  if (element.getAttribute(name) !== nextValue) {
    element.setAttribute(name, nextValue)
  }
}

export function removeAttributeIfPresent(element: Element, name: string): void {
  if (element.hasAttribute(name)) {
    element.removeAttribute(name)
  }
}

export function setPropertyIfChanged<T, K extends keyof T>(
  object: T,
  key: K,
  value: T[K],
): void {
  if (object[key] !== value) {
    object[key] = value
  }
}

export function setStylePropertyIfChanged(
  style: CSSStyleDeclaration,
  property: string,
  value: string,
): void {
  if (style.getPropertyValue(property) !== value) {
    style.setProperty(property, value)
  }
}

export function removeStylePropertyIfPresent(
  style: CSSStyleDeclaration,
  property: string,
): void {
  if (style.getPropertyValue(property) !== ``) {
    style.removeProperty(property)
  }
}

function createRangeOrCaretFromPoint(
  doc: Document,
  startX: number,
  startY: number,
) {
  // @see https://developer.mozilla.org/en-US/docs/Web/API/Document/caretPositionFromPoint
  if (`caretPositionFromPoint` in doc) {
    // @see https://developer.mozilla.org/en-US/docs/Web/API/CaretPosition
    return doc.caretPositionFromPoint(startX, startY) as {
      offsetNode: Node
      offset: number
    }
  }
  if (
    "caretRangeFromPoint" in doc &&
    // @ts-expect-error limited availability
    typeof doc.caretRangeFromPoint !== "undefined"
  ) {
    // @ts-expect-error limited availability
    return doc.caretRangeFromPoint(startX, startY)
  }
}

export type Box = { left: number; right: number; top: number; bottom: number }

/**
 * Whether a rect overlaps a box on both axes. One that only touches an edge
 * of the box, such as text at the start of the next page, does not.
 */
const isRectInBox = (rect: DOMRect, box: Box) =>
  rect.right > box.left &&
  rect.left < box.right &&
  rect.bottom > box.top &&
  rect.top < box.bottom

/**
 * Where a line box of an element starts, as a whole-pixel point inside it when
 * it spans one: its left edge, or a pixel inside its right edge for horizontal
 * text written right to left. A vertical line starts at its top.
 */
const getStartOfLineBox = (lineBox: DOMRect, element: Element) => {
  const style = element.ownerDocument.defaultView?.getComputedStyle(element)
  const isHorizontalRightToLeft =
    style?.direction === "rtl" && !style.writingMode.startsWith("vertical")

  return {
    x: isHorizontalRightToLeft
      ? Math.ceil(lineBox.right) - 1
      : Math.ceil(lineBox.left),
    y: Math.ceil(lineBox.top),
  }
}

const isElementNode = (node: Node): node is Element =>
  node.nodeType === Node.ELEMENT_NODE

const isTextNode = (node: Node): node is Text =>
  node.nodeType === Node.TEXT_NODE

/**
 * Where the text of `text` starts in `box`: the offset of its first character
 * there, `undefined` when none of its text is in `box`. `range` is one the
 * lookup uses again for each text it measures.
 */
const getOffsetOfFirstCharacterInBox = (
  text: Text,
  parentElement: Element,
  box: Box,
  range: Range,
) => {
  range.selectNodeContents(text)

  // this forces layout ? needs to find better approach
  const lineBoxInBox = Array.from(range.getClientRects()).find((rect) =>
    isRectInBox(rect, box),
  )

  if (!lineBoxInBox) return undefined

  /**
   * The text is in the box. Finding which of its characters is the first one
   * there by measuring them is an incredibly expensive operation, so we ask
   * the browser for the caret at the start of the line.
   * @important
   * when using float value it looks like sometime when at the begin of the book the returned range will be the last offset of the page
   * it can be tested with moby-dick.txt by using different font size. Whenever using something different than default font size we might
   * have floating point for font and we start having issue. Using ceil "make sure" to be inside the point. Hopefully.
   */
  const startOfLineBox = getStartOfLineBox(lineBoxInBox, parentElement)
  const rangeOrCaret = createRangeOrCaretFromPoint(
    text.ownerDocument,
    startOfLineBox.x,
    startOfLineBox.y,
  )

  // A caret in another node says nothing about this one: the text still
  // starts in the box, at an offset we do not know.
  if (rangeOrCaret && `startContainer` in rangeOrCaret) {
    return rangeOrCaret.startContainer === text ? rangeOrCaret.startOffset : 0
  }

  if (rangeOrCaret && `offsetNode` in rangeOrCaret) {
    return rangeOrCaret.offsetNode === text ? rangeOrCaret.offset : 0
  }

  return 0
}

/**
 * The first node, in document order, with a box in `box`, and the offset in
 * it of the first character there. `box` is in the coordinates of the
 * document's own viewport, as `getClientRects()` measures them.
 *
 * A text comes before the elements that follow it in its parent: for
 * `<p>One <em>two</em></p>` at the start of the box, the node is `One `.
 *
 * @todo optimize
 */
export const getFirstNodeInBox = (documentToSearch: Document, box: Box) => {
  const range = documentToSearch.createRange()

  const getFirstNodeInBoxOfElement = (
    element: Element,
  ): { node: Node; offset: number } | undefined => {
    const elementRect = element.getBoundingClientRect()
    const isElementInBox = isRectInBox(elementRect, box)
    /**
     * A text is laid out in the box of its parent, so the texts of an
     * element that is out of the box are not measured: that is one layout
     * read less for each text before the box. An element with no box of its
     * own, such as one with `display: contents`, has its text in the box of
     * an ancestor.
     */
    const canHaveTextInBox =
      isElementInBox || (elementRect.width === 0 && elementRect.height === 0)

    for (const childNode of element.childNodes) {
      if (isElementNode(childNode)) {
        /**
         * @important
         * We cannot skip the children of an element that is out of the box:
         * a child can be positioned outside of its parent.
         */
        const nodeInBox = getFirstNodeInBoxOfElement(childNode)

        if (nodeInBox) return nodeInBox
      } else if (
        canHaveTextInBox &&
        isTextNode(childNode) &&
        // Blank text between two elements is most of the texts of a document,
        // and is never what a page starts with.
        /\S/.test(childNode.data)
      ) {
        const offset = getOffsetOfFirstCharacterInBox(
          childNode,
          element,
          box,
          range,
        )

        if (offset !== undefined) return { node: childNode, offset }
      }
    }

    return isElementInBox ? { node: element, offset: 0 } : undefined
  }

  return getFirstNodeInBoxOfElement(documentToSearch.body)
}

export const getRangeFromNode = (node: Node, offset: number) => {
  if (
    node.nodeType !== Node.CDATA_SECTION_NODE &&
    node.nodeType !== Node.DOCUMENT_TYPE_NODE
  ) {
    const range = node.ownerDocument?.createRange()
    range?.selectNodeContents(node)

    try {
      if (offset <= (range?.endOffset || 0)) {
        range?.setStart(node, offset || 0)
      }
    } catch (e) {
      Report.error(e)
    }

    return range
  }

  return undefined
}

/**
 * The node after `node` in document order: its first child, or, with
 * `skipDescendants` or when it has none, the next sibling of it or of its
 * closest ancestor that has one. Never one of its ancestors.
 */
export const getNextNodeInDocumentOrder = (
  node: Node,
  { skipDescendants }: { skipDescendants: boolean },
) => {
  if (!skipDescendants && node.firstChild) return node.firstChild

  let nodeOrAncestor: Node | null = node

  while (nodeOrAncestor && !nodeOrAncestor.nextSibling) {
    nodeOrAncestor = nodeOrAncestor.parentNode
  }

  return nodeOrAncestor?.nextSibling ?? null
}

export const noopElement = () => document.createElement("div")

/**
 * Generic structural type checker - checks if an object has the expected properties
 * @param obj The object to check
 * @param requiredProps Array of property names that must exist
 * @param optionalMethods Array of method names that should be functions (optional)
 */
export function hasShape<T>(
  obj: unknown,
  requiredProps: (keyof T)[],
  optionalMethods: (keyof T)[] = [],
): obj is T {
  if (typeof obj !== "object" || obj === null) return false

  // Check required properties exist
  for (const prop of requiredProps) {
    if (!(prop in obj)) return false
  }

  // Check optional methods are functions
  for (const method of optionalMethods) {
    // biome-ignore lint/suspicious/noExplicitAny: TODO
    if (method in obj && typeof (obj as any)[method] !== "function") {
      return false
    }
  }

  return true
}

/**
 * Global env agnostic method to detect if an element is HtmlElement.
 *
 * @example
 * checking instance of element from iframe will not work because
 * `window.HtmlElement` is not the same as iframe.window.HtmlElement
 * element instanceof HtmlElement -> false
 *
 * isHtmlElement(element) -> true
 */
export function isHtmlElement(element: unknown): element is HTMLElement {
  return (
    hasShape<HTMLElement>(
      element,
      ["nodeType"],
      [],
      // biome-ignore lint/suspicious/noExplicitAny: TODO
    ) && (element as any).nodeType === Node.ELEMENT_NODE
  )
}

/**
 * Type guard function to check if an element is a specific HTML tag element
 * @param element The element to check
 * @param tagName The HTML tag name (e.g., 'div', 'span', 'a')
 * @returns True if the element is an HTMLElement of the specified tag
 */
export function isHtmlTagElement<K extends keyof HTMLElementTagNameMap>(
  element: unknown,
  tagName: K,
): element is HTMLElementTagNameMap[K] {
  return (
    isHtmlElement(element) &&
    element.tagName.toLowerCase() === tagName.toLowerCase()
  )
}

export function isHtmlRange(element: unknown): element is Range {
  return hasShape<Range>(
    element,
    [
      "startContainer",
      "endContainer",
      "startOffset",
      "endOffset",
      "collapsed",
      "commonAncestorContainer",
    ],
    ["setStart", "setEnd", "selectNodeContents"],
  )
}

export const injectCSS = (
  doc: Document,
  id: string,
  style: string,
  prepend?: boolean,
) => {
  const userStyle = doc.createElement(`style`)
  userStyle.id = id
  userStyle.textContent = style

  if (prepend) {
    doc.head.prepend(userStyle)
  } else {
    doc.head.appendChild(userStyle)
  }

  return () => {
    removeCSS(doc, id)
  }
}

export const removeCSS = (doc: Document, id: string) => {
  if (doc?.head) {
    const styleElement = doc.getElementById(id)

    if (styleElement) {
      styleElement.remove()
    }
  }
}
