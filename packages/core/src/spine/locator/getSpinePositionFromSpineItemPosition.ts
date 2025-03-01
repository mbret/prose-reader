import type { SpineItemPosition } from "../../spineItem/types"
import { SpinePosition } from "../types"

/**
 * Be careful when using with spread with RTL, this will return the position for one page size. This is in order to prevent wrong position when
 * an item is not taking the entire spread. That way we always have a valid position for the given item. However you need to adjust it
 * when on spread mode to be sure to position the viewport on the edge.
 *
 * @example
 * [    item-a   |   item-a   ]
 * 400          200           0
 * will return 200, which probably needs to be adjusted as 0
 */
export const getSpinePositionFromSpineItemPosition = ({
  spineItemPosition,
  itemLayout: { left, top },
}: {
  spineItemPosition: SpineItemPosition
  itemLayout: { left: number; top: number }
}) => {
  /**
   * For this case the global offset move from right to left but this specific item
   * reads from left to right. This means that when the offset is at the start of the item
   * it is in fact at his end. This behavior can be observed in `haruko` about chapter.
   * @example
   * <---------------------------------------------------- global offset
   * item offset ------------------>
   * [item2 (page0 - page1 - page2)] [item1 (page1 - page0)] [item0 (page0)]
   */
  // if (context.isRTL() && itemReadingDirection === 'ltr') {
  //   return (end - spineItemOffset) - context.getPageSize().width
  // }

  return new SpinePosition({
    x: left + spineItemPosition.x,
    y: top + spineItemPosition.y,
  })
}
