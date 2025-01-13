import type { Context } from "../../context/Context"
import { getItemOffsetFromPageIndex } from "../helpers"
import type { SafeSpineItemPosition } from "../types"

export const getSpineItemPositionFromPageIndex = ({
  pageIndex,
  itemLayout,
  context,
  isUsingVerticalWriting,
}: {
  pageIndex: number
  itemLayout: { width: number; height: number }
  context: Context
  isUsingVerticalWriting: boolean
}): SafeSpineItemPosition => {
  if (isUsingVerticalWriting) {
    const ltrRelativeOffset = getItemOffsetFromPageIndex(
      context.getPageSize().height,
      pageIndex,
      itemLayout.height,
    )

    return {
      x: 0,
      y: ltrRelativeOffset,
    }
  }

  const ltrRelativeOffset = getItemOffsetFromPageIndex(
    context.getPageSize().width,
    pageIndex,
    itemLayout.width,
  )

  if (context.isRTL()) {
    return {
      x: itemLayout.width - ltrRelativeOffset - context.getPageSize().width,
      y: 0,
    }
  }

  return {
    x: ltrRelativeOffset,
    y: 0,
  }
}
