/**
 * Position of an item relative to the 0:0 position
 * in the spine.
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
  __symbol?: `SpineRelativePosition`
}
