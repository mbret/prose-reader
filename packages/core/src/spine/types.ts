export class SpineElementLayout {
  public readonly left: number
  public readonly right: number
  public readonly top: number
  public readonly bottom: number
  public readonly width: number
  public readonly height: number
  public readonly x: number
  public readonly y: number

  constructor(layout: {
    left: number
    right: number
    top: number
    bottom: number
    width: number
    height: number
    x: number
    y: number
  }) {
    this.left = layout.left
    this.right = layout.right
    this.top = layout.top
    this.bottom = layout.bottom
    this.width = layout.width
    this.height = layout.height
    this.x = layout.x
    this.y = layout.y
  }
}
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
export class SpineItemSpineLayout extends SpineElementLayout {
  public readonly __symbol = Symbol(`SpineItemSpineLayout`)
}

export class SpineItemPageSpineLayout extends SpineElementLayout {
  public readonly __symbol = Symbol(`SpineItemPageSpineLayout`)
}

/**
 * Position of an element relative to the spine.
 *
 * This can be used for item, pages.
 */
export class SpinePosition {
  public readonly x: number
  public readonly y: number
  public readonly __symbol = Symbol(`SpinePosition`)

  constructor(position: { x: number; y: number }) {
    this.x = position.x
    this.y = position.y
  }
}
