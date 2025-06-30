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

export class AbstractSpinePosition {
  public readonly x: number
  public readonly y: number

  constructor(position: { x: number; y: number }) {
    this.x = position.x
    this.y = position.y
  }
}

/**
 * Position of an element relative to the spine.
 *
 * This can be used for item, pages.
 *
 * @important
 * This position is not guaranteed to be valid and/or navigable.
 * Its purpose is to be used for navigation and/or calculations but you may need
 * to do proper validation depending of the context.
 */
export class SpinePosition extends AbstractSpinePosition {
  public readonly __symbol = `SpinePosition`
}

/**
 * Represent an obvious not valid spine position. Not valid means mostly:
 * - out of bounds
 * - not in the spine
 * - not navigable
 *
 * Although a SpinePosition can always be invalid, its usage is clear.
 * This distinction is here to help developer understand the context better.
 *
 * If you end up somewhere with an UnsafeSpinePosition, it means you need to
 * validate it somehow and probably do some translation.
 */
export class UnsafeSpinePosition extends AbstractSpinePosition {
  public readonly __symbol = `UnsafeSpinePosition`

  static from(position: SpinePosition) {
    return new UnsafeSpinePosition(position)
  }
}
