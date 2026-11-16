import { Report } from "../report"

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

/**
 * The first node, in document order, with a box in `box`, and the offset in
 * it of the first character there. `box` is in the coordinates of the
 * document's own viewport, as `getClientRects()` measures them.
 *
 * @todo optimize
 */
export const getFirstNodeInBox = (documentToSearch: Document, box: Box) => {
  const element = getFirstElementInBox(documentToSearch.body, box)

  if (element) {
    let lastValidRange: Range | undefined
    let lastValidOffset = 0
    const range = documentToSearch.createRange()

    /**
     * We iterate through children to ensure we match the writing mode (direction)
     * of the document (This is easier than having to do some heuristics to match the direction)
     * Although probably not perfect ?
     */
    Array.from(element.childNodes).some((childNode) => {
      range.selectNodeContents(childNode)

      const rects = range.getClientRects() // this forces layout ? needs to find better approach

      const visibleRect = Array.from(rects).find((rect) =>
        isRectInBox(rect, box),
      )

      // At this point we know the range is valid and contains visible rect.
      // This means we have a valid Node. We still need to know the visible offset to be 100% accurate
      if (visibleRect) {
        lastValidRange = range.cloneRange()

        /**
         * Now we will try to refine the search to get the offset
         * this is an incredibly expensive operation so we will try to
         * use native functions to get something
         * @important
         * when using float value it looks like sometime when at the begin of the book the returned range will be the last offset of the page
         * it can be tested with moby-dick.txt by using different font size. Whenever using something different than default font size we might
         * have floating point for font and we start having issue. Using ceil "make sure" to be inside the point. Hopefully.
         */
        const startOfLineBox = getStartOfLineBox(visibleRect, element)
        const rangeOrCaret = createRangeOrCaretFromPoint(
          documentToSearch,
          startOfLineBox.x,
          startOfLineBox.y,
        )

        // good news we found something with same node so we can assume the offset is already better than nothing
        if (
          rangeOrCaret &&
          `startContainer` in rangeOrCaret &&
          rangeOrCaret.startContainer === lastValidRange.startContainer
        ) {
          lastValidOffset = rangeOrCaret.startOffset
        }
        if (
          rangeOrCaret &&
          `offsetNode` in rangeOrCaret &&
          rangeOrCaret.offsetNode === lastValidRange.startContainer
        ) {
          lastValidOffset = rangeOrCaret.offset
        }
        return true
      }
      return false
    })

    if (lastValidRange) {
      return {
        node: lastValidRange.startContainer,
        offset: lastValidOffset,
      }
    }

    return { node: element, offset: 0 }
  }

  return undefined
}

const getFirstElementInBox = (
  element: Element,
  box: Box,
): Element | undefined => {
  let lastValidElement: Element | undefined

  /**
   * @important
   * We cannot safely early return if the element is completely outside bounds. This is
   * because a children of that element could very much be positioned outside of its parent.
   *
   * We could do some heuristic assumptions or checking depth but nothing is quite safe at 100%
   */

  if (isRectInBox(element.getBoundingClientRect(), box)) {
    lastValidElement = element
  }

  for (const child of element.children) {
    const childInBox = getFirstElementInBox(child, box)

    if (childInBox) {
      return childInBox
    }
  }

  return lastValidElement
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
