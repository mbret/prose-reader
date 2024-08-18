import { Context } from "../../context/Context"
import { getSpineItemPositionFromPageIndex } from "../../spineItem/locator/getSpineItemPositionFromPageIndex"
import { getSpinePositionFromSpineItemPosition } from "./getSpinePositionFromSpineItemPosition"

export const getSpinePositionFromSpineItemPageIndex = ({
  pageIndex,
  context,
  isUsingVerticalWriting,
  itemLayout,
}: {
  pageIndex: number
  isUsingVerticalWriting: boolean
  context: Context
  itemLayout: { left: number; top: number; width: number; height: number }
}) => {
  const spineItemPosition = getSpineItemPositionFromPageIndex({
    pageIndex,
    context,
    isUsingVerticalWriting,
    itemLayout,
  })

  return getSpinePositionFromSpineItemPosition({
    itemLayout,
    spineItemPosition,
  })
}
