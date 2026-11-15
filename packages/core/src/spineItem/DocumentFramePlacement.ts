import { getRenderedScale } from "../utils/coordinates"
import type { SpineItem } from "./SpineItem"
import { SpineItemPosition } from "./types"

type Box = { left: number; right: number; top: number; bottom: number }

/**
 * Where the document frame of a spine item sits in the item, as it is
 * rendered: the item position of the frame's top-left corner, and the scale
 * of the frame in the item. A renderer can move the frame in its item, as it
 * does for a blank page before the text in a spread, and scale it, as it does
 * for a pre-paginated page that fits the page.
 *
 * A rect measured in the frame's document, with `getClientRects()`, is in the
 * frame's coordinates. This converts it to the item's coordinates, and a box
 * of the item back to the frame's.
 */
export class DocumentFramePlacement {
  constructor(
    private readonly x: number,
    private readonly y: number,
    private readonly scaleX: number,
    private readonly scaleY: number,
  ) {}

  /**
   * Measures it from the rendered boxes of the frame and of the item, so it
   * holds whatever transforms the spine and its ancestors have. An item
   * without a frame has its document at its top-left corner, unscaled.
   */
  static measure(spineItem: SpineItem) {
    const frame = spineItem.renderer.getDocumentFrame()

    if (!frame) return new DocumentFramePlacement(0, 0, 1, 1)

    const { containerElement } = spineItem
    const itemRect = containerElement.getBoundingClientRect()
    const frameRect = frame.getBoundingClientRect()
    const itemScaleX = getRenderedScale({
      renderedSize: itemRect.width,
      layoutSize: containerElement.offsetWidth,
    })
    const itemScaleY = getRenderedScale({
      renderedSize: itemRect.height,
      layoutSize: containerElement.offsetHeight,
    })
    const frameScaleX = getRenderedScale({
      renderedSize: frameRect.width,
      layoutSize: frame.offsetWidth,
    })
    const frameScaleY = getRenderedScale({
      renderedSize: frameRect.height,
      layoutSize: frame.offsetHeight,
    })

    return new DocumentFramePlacement(
      (frameRect.left - itemRect.left) / itemScaleX,
      (frameRect.top - itemRect.top) / itemScaleY,
      frameScaleX / itemScaleX,
      frameScaleY / itemScaleY,
    )
  }

  /** A point of the frame's document, in the item. */
  toSpineItemPosition({ x, y }: { x: number; y: number }) {
    return new SpineItemPosition({
      x: this.x + x * this.scaleX,
      y: this.y + y * this.scaleY,
    })
  }

  /** A box of the item, in the frame's document. */
  toDocumentBox({ left, right, top, bottom }: Box): Box {
    return {
      left: (left - this.x) / this.scaleX,
      right: (right - this.x) / this.scaleX,
      top: (top - this.y) / this.scaleY,
      bottom: (bottom - this.y) / this.scaleY,
    }
  }
}
