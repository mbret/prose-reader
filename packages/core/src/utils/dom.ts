import { Report } from "../report"

const pointerEvents: string[] = [
  `pointercancel` as const,
  `pointerdown` as const,
  `pointerenter` as const,
  `pointerleave` as const,
  `pointermove` as const,
  `pointerout` as const,
  `pointerover` as const,
  `pointerup` as const,
  // `touchstart` as const,
  // `touchend` as const,
]

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

type ViewPort = { left: number; right: number; top: number; bottom: number }

/**
 * @todo optimize
 */
export const getFirstVisibleNodeForPositionRelativeTo = (
  documentOrElement: Document | Element,
  viewport: ViewPort,
) => {
  const ownerDocument =
    `createRange` in documentOrElement
      ? documentOrElement
      : documentOrElement.ownerDocument

  if (!ownerDocument) return undefined

  const element =
    `body` in documentOrElement
      ? getFirstVisibleElementForViewport(documentOrElement.body, viewport)
      : getFirstVisibleElementForViewport(documentOrElement, viewport)

  if (element) {
    let lastValidRange: Range | undefined
    let lastValidOffset = 0
    const range = ownerDocument.createRange()

    /**
     * We iterate through children to ensure we match the writing mode (direction)
     * of the document (This is easier than having to do some heuristics to match the direction)
     * Although probably not perfect ?
     */
    Array.from(element.childNodes).some((childNode) => {
      range.selectNodeContents(childNode)

      const rects = range.getClientRects() // this forces layout ? needs to find better approach

      const visibleRect = getFirstVisibleDOMRect(rects, viewport)

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
        const rangeOrCaret = createRangeOrCaretFromPoint(
          ownerDocument,
          Math.ceil(visibleRect.left),
          Math.ceil(visibleRect.top),
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

const getFirstVisibleElementForViewport = (
  element: Element,
  viewport: ViewPort,
): Element | undefined => {
  const rect = element.getBoundingClientRect()
  const positionFromViewport = getElementOrNodePositionFromViewPort(
    rect,
    viewport,
  )

  let lastValidElement: Element | undefined

  /**
   * @important
   * We cannot safely early return if the element is completely outside bounds. This is
   * because a children of that element could very much be positioned outside of its parent.
   *
   * We could do some heuristic assumptions or checking depth but nothing is quite safe at 100%
   */

  if (positionFromViewport !== `before` && positionFromViewport !== `after`) {
    lastValidElement = element
  }

  for (const child of element.children) {
    const childInViewPort = getFirstVisibleElementForViewport(child, viewport)

    if (childInViewPort) {
      return childInViewPort
    }
  }

  return lastValidElement
}

function getElementOrNodePositionFromViewPort(
  domRect: DOMRect,
  { left, right }: ViewPort,
) {
  // horizontal + ltr
  if (domRect.left <= left && domRect.right <= left) return `before`
  if (domRect.left <= left && domRect.right > left && domRect.right <= right)
    return `partially-before`
  if (domRect.left <= right && domRect.right > right) return `partially-after`
  if (domRect.left > right) return `after`
  return `within`

  // @todo rtl
  // @todo vertical-lrt
  // @todo vertical-rtl
}

function getFirstVisibleDOMRect(domRect: DOMRectList, viewport: ViewPort) {
  return Array.from(domRect).find((domRect) => {
    const position = getElementOrNodePositionFromViewPort(domRect, viewport)

    if (position !== `before` && position !== `after`) {
      return true
    }
    return false
  })
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

export const isPointerEvent = (event: Event): event is PointerEvent => {
  if (
    (event as PointerEvent)?.target &&
    (event?.target as Element)?.ownerDocument?.defaultView
  ) {
    const eventView = (event?.target as Element)?.ownerDocument
      ?.defaultView as Window & typeof globalThis

    if (eventView.PointerEvent && event instanceof eventView.PointerEvent) {
      return true
    }
  }

  if ((event as PointerEvent)?.view?.window) {
    const eventView = (event as PointerEvent)?.view as Window &
      typeof globalThis

    if (eventView.PointerEvent && event instanceof eventView.PointerEvent) {
      return true
    }
  }

  if (pointerEvents.includes(event.type)) {
    return true
  }

  return false
}

export const isMouseEvent = (event: Event): event is MouseEvent => {
  if (isPointerEvent(event)) return false

  if (
    (event as MouseEvent)?.target &&
    (event?.target as Element)?.ownerDocument?.defaultView
  ) {
    const eventView = (event?.target as Element)?.ownerDocument
      ?.defaultView as Window & typeof globalThis

    if (eventView.MouseEvent) {
      return event instanceof eventView.MouseEvent
    }
  }

  if ((event as MouseEvent)?.view?.window) {
    const eventView = (event as MouseEvent)?.view as Window & typeof globalThis

    if (eventView.MouseEvent) {
      return event instanceof eventView.MouseEvent
    }
  }

  return false
}

export const isTouchEvent = (event: Event): event is TouchEvent => {
  if (
    (event as TouchEvent)?.target &&
    (event?.target as Element)?.ownerDocument?.defaultView
  ) {
    const eventView = (event?.target as Element)?.ownerDocument
      ?.defaultView as Window & typeof globalThis

    if (eventView.TouchEvent) {
      return event instanceof eventView.TouchEvent
    }
  }

  if ((event as TouchEvent)?.view?.window) {
    const eventView = (event as TouchEvent)?.view as Window & typeof globalThis

    if (eventView.TouchEvent) {
      return event instanceof eventView.TouchEvent
    }
  }

  return false
}

export const noopElement = () => document.createElement("div")

export const getElementsWithAssets = (
  _document: Document | null | undefined,
) => {
  const RESOURCE_ELEMENTS = [
    "img", // Images
    "video", // Video files
    "audio", // Audio files
    "source", // Source elements within video/audio
    "link", // Stylesheets and other linked resources
    "script", // JavaScript files
  ].join(",")

  return Array.from(_document?.querySelectorAll(RESOURCE_ELEMENTS) || [])
}

/**
 * Revoke all found blob urls in the document
 * - elements with src or href attribute
 * - stylesheet font-face rules
 */
export const revokeDocumentBlobs = (_document: Document | null | undefined) => {
  const elementsWithAsset = getElementsWithAssets(_document)

  elementsWithAsset.forEach((element) => {
    const url = element.getAttribute("src") || element.getAttribute("href")

    if (url?.startsWith("blob:")) {
      _document?.defaultView?.URL.revokeObjectURL(url)
    }
  })

  if (_document) {
    const styleSheets = Array.from(_document.styleSheets || [])

    for (const sheet of styleSheets) {
      const rules = Array.from(sheet.cssRules || [])

      for (const rule of rules) {
        if (
          _document.defaultView &&
          rule instanceof _document.defaultView.CSSFontFaceRule
        ) {
          // eg:
          // 'url("font.woff2") format("woff2"), url("font.woff") format("woff"), url(blob:http://example.com/1234) format("opentype")'
          // 'url(blob:http://example.com/1234)'
          const src = rule.style.getPropertyValue("src")
          // handle multiple comma-separated sources
          const blobUrls = src.match(/blob:[^,\s'")]+/g)

          if (blobUrls) {
            blobUrls.forEach((url) => {
              _document?.defaultView?.URL.revokeObjectURL(url)
            })
          }
        }
      }
    }
  }
}

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
  userStyle.innerHTML = style

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
