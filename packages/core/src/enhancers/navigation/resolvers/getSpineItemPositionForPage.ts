import type { SpineItemLocator } from "../../../spineItem/locationResolver"
import type { SpineItem } from "../../../spineItem/SpineItem"
import { SpineItemPosition } from "../../../spineItem/types"
import {
  getPageNavigationDirectionSign,
  type PageNavigationDirection,
} from "./pageNavigationDirection"

export const getSpineItemPositionForPage = ({
  position,
  spineItem,
  pageHeight,
  pageWidth,
  spineItemLocator,
  direction,
}: {
  position: SpineItemPosition
  spineItem: SpineItem
  pageWidth: number
  pageHeight: number
  spineItemLocator: SpineItemLocator
  direction: PageNavigationDirection
}): SpineItemPosition => {
  const sign = getPageNavigationDirectionSign(direction)

  let nextPotentialPosition = new SpineItemPosition({
    x: position.x + sign * pageWidth,
    y: position.y,
  })

  if (spineItem.isUsingVerticalWriting()) {
    nextPotentialPosition = new SpineItemPosition({
      x: position.x,
      y: position.y - sign * pageHeight,
    })
  }

  const navigationPosition =
    spineItemLocator.getSpineItemClosestPositionFromUnsafePosition(
      nextPotentialPosition,
      spineItem,
    )

  return navigationPosition
}
