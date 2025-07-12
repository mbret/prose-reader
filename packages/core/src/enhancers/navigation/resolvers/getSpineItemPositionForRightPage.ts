import type { SpineItemLocator } from "../../../spineItem/locationResolver"
import type { SpineItem } from "../../../spineItem/SpineItem"
import { SpineItemPosition } from "../../../spineItem/types"

export const getSpineItemPositionForRightPage = ({
  position,
  spineItem,
  pageHeight,
  pageWidth,
  spineItemLocator,
}: {
  position: SpineItemPosition
  spineItem: SpineItem
  pageWidth: number
  pageHeight: number
  spineItemLocator: SpineItemLocator
}): SpineItemPosition => {
  let nextPotentialPosition = new SpineItemPosition({
    x: position.x + pageWidth,
    y: position.y,
  })

  if (spineItem.isUsingVerticalWriting()) {
    nextPotentialPosition = new SpineItemPosition({
      x: position.x,
      y: position.y - pageHeight,
    })
  }

  const navigationPosition =
    spineItemLocator.getSpineItemClosestPositionFromUnsafePosition(
      nextPotentialPosition,
      spineItem,
    )

  return navigationPosition
}
