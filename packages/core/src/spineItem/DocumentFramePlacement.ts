import { getRenderedScale } from "../utils/coordinates"
import type { Box } from "../utils/dom"
import { SpineItemPosition } from "./types"

/**
 * The layout size of an element, before any transform, from its computed
 * style. `offsetWidth` and `offsetHeight` round it to whole pixels, while its
 * rendered size is not rounded: a page half of an odd window width would
 * measure a scale where there is none.
 */
const getLayoutSize = (element: HTMLElement) => {
  const style = element.ownerDocument.defaultView?.getComputedStyle(element)

  return {
    width: Number.parseFloat(style?.width ?? ""),
    height: Number.parseFloat(style?.height ?? ""),
  }
}

/**
 * The scale an element is rendered at, on each axis, from its rendered box
 * and its layout size.
 */
const getRenderedScaleOfElement = (element: HTMLElement, rect: DOMRect) => {
  const layoutSize = getLayoutSize(element)

  return {
    x: getRenderedScale({
      renderedSize: rect.width,
      layoutSize: layoutSize.width,
    }),
    y: getRenderedScale({
      renderedSize: rect.height,
      layoutSize: layoutSize.height,
    }),
  }
}

/**
 * Where the document frame of a spine item sits in the item, as it is
 * rendered: the item position of the frame's top-left corner, and the scale
 * of the frame in the item. A renderer can move the frame in its item, as it
 * does to leave a blank page to its left in a spread, and scale it, as it
 * does to fit a document with a fixed viewport, such as a pre-paginated page,
 * into the page.
 *
 * `getClientRects()` measures a node in the frame's coordinates. This converts
 * a point of the frame to the item's coordinates, and a box of the item to the
 * frame's.
 */
export class DocumentFramePlacement {
  constructor(
    private readonly x: number,
    private readonly y: number,
    private readonly scaleX: number,
    private readonly scaleY: number,
  ) {}

  /**
   * Measures it from the rendered boxes of the frame and of the item's
   * element, so it holds whatever transforms the spine and its ancestors
   * have. Without a frame, it moves and scales nothing.
   */
  static measure({
    itemElement,
    frameElement,
  }: {
    itemElement: HTMLElement
    frameElement: HTMLElement | undefined
  }) {
    if (!frameElement) return new DocumentFramePlacement(0, 0, 1, 1)

    const itemRect = itemElement.getBoundingClientRect()
    const frameRect = frameElement.getBoundingClientRect()
    const itemScale = getRenderedScaleOfElement(itemElement, itemRect)
    const frameScale = getRenderedScaleOfElement(frameElement, frameRect)

    return new DocumentFramePlacement(
      (frameRect.left - itemRect.left) / itemScale.x,
      (frameRect.top - itemRect.top) / itemScale.y,
      frameScale.x / itemScale.x,
      frameScale.y / itemScale.y,
    )
  }

  /** A point of the frame, in the item. */
  toSpineItemPosition({ x, y }: { x: number; y: number }) {
    return new SpineItemPosition({
      x: this.x + x * this.scaleX,
      y: this.y + y * this.scaleY,
    })
  }

  /** A box of the item, in the frame. */
  toFrameBox({ left, right, top, bottom }: Box): Box {
    return {
      left: (left - this.x) / this.scaleX,
      right: (right - this.x) / this.scaleX,
      top: (top - this.y) / this.scaleY,
      bottom: (bottom - this.y) / this.scaleY,
    }
  }
}
