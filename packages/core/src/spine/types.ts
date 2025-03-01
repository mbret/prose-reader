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
export type SpineItemRelativeLayout = {
  left: number
  right: number
  top: number
  bottom: number
  width: number
  height: number
  x: number
  y: number
  __symbol?: `SpineItemRelativeLayout`
}

/**
 * Position of an element relative to the spine.
 *
 * This can be used for item, pages.
 */
export type SpinePosition = {
  x: number
  y: number
  __symbol?: `SpinePosition` | SpineItemRelativeLayout["__symbol"]
}
