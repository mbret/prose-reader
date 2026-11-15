import { LayoutEntry } from "../spineItem/types"

/**
 * Position of an item relative to spine element.
 *
 * LTR (Spine spread positively from left=0)
 * [item1 ]     [item2]
 * [0, 100]     [100, 200]
 * [x: 0, y: 0] [x: 100, y: 0]
 *
 * RTL (Spine spread negatively from right=0)
 * [item1 ]               [item2]
 * [-100, 0]              [0, 100]
 * [left: -100, right: 0] [left: 0, right: 100]
 *
 * This allow the viewport to move in a natural position following the reading direction.
 *
 * This is similar to `getBoundingClientRect` but is stable since it is absolute and will not
 * changed if any transformation is applied to the spine. A different term could be absolute position
 * of an element relative to the book view.
 *
 * You can leverage this layout info for positioning overlay elements (eg: bookmarks).
 */
export class SpineItemSpineLayout extends LayoutEntry {
  public readonly __symbol = `SpineItemSpineLayout`
}

export class SpineItemPageSpineLayout extends LayoutEntry {
  public readonly __symbol = `SpineItemPageSpineLayout`
}

/**
 * The smallest box that holds spine items, in the coordinates of their
 * `SpineItemSpineLayout`.
 */
export class SpineBoundingBox extends LayoutEntry {
  public readonly __symbol = `SpineBoundingBox`

  /** The box that holds these layouts, or `undefined` when there are none. */
  static fromSpineItemLayouts(layouts: readonly SpineItemSpineLayout[]) {
    if (layouts.length === 0) return undefined

    let left = Number.POSITIVE_INFINITY
    let right = Number.NEGATIVE_INFINITY
    let top = Number.POSITIVE_INFINITY
    let bottom = Number.NEGATIVE_INFINITY

    for (const layout of layouts) {
      left = Math.min(left, layout.left)
      right = Math.max(right, layout.right)
      top = Math.min(top, layout.top)
      bottom = Math.max(bottom, layout.bottom)
    }

    return new SpineBoundingBox({
      left,
      right,
      top,
      bottom,
      width: right - left,
      height: bottom - top,
      x: left,
      y: top,
    })
  }
}

export class AbstractSpinePosition {
  public readonly x: number
  public readonly y: number

  constructor(position: { x: number; y: number }) {
    this.x = position.x
    this.y = position.y
  }
}

/**
 * Guaranteed to be a valid spine position at a given layout.
 *
 * Meaning:
 * - within safe edges x/y
 * - at a valid page edge offset
 */
export class SpinePosition extends AbstractSpinePosition {
  public readonly __symbol = `SpinePosition`

  static from(position: UnboundSpinePosition | SpinePosition) {
    return new SpinePosition(position)
  }
}

/**
 * Represents a spine position that may not be:
 * - within safe edges x/y (eg: out of bounds)
 * - at a page edge offset (eg: 20% on a page)
 *
 * Such spine position is usually used for scroll navigation or calculations
 * of relative things.
 *
 * This is just a class to flag potential misuses, getting a UnboundSpinePosition does not
 * means the position is offset.
 */
export class UnboundSpinePosition extends AbstractSpinePosition {
  public readonly __symbol = `UnboundSpinePosition`

  static from(position: SpinePosition) {
    return new UnboundSpinePosition(position)
  }
}
