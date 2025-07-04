import type { Context } from "../../context/Context"
import type { Viewport } from "../../viewport/Viewport"
import { getItemOffsetFromPageIndex } from "../helpers"
import { SpineItemPosition } from "../types"

export const getSpineItemPositionFromPageIndex = ({
  pageIndex,
  itemLayout,
  context,
  isUsingVerticalWriting,
  viewport,
}: {
  pageIndex: number
  itemLayout: { width: number; height: number }
  context: Context
  isUsingVerticalWriting: boolean
  viewport: Viewport
}): SpineItemPosition => {
  if (isUsingVerticalWriting) {
    const ltrRelativeOffset = getItemOffsetFromPageIndex(
      viewport.pageSize.height,
      pageIndex,
      itemLayout.height,
    )

    return new SpineItemPosition({
      x: 0,
      y: ltrRelativeOffset,
    })
  }

  const ltrRelativeOffset = getItemOffsetFromPageIndex(
    viewport.pageSize.width,
    pageIndex,
    itemLayout.width,
  )

  if (context.isRTL()) {
    return new SpineItemPosition({
      x: itemLayout.width - ltrRelativeOffset - viewport.pageSize.width,
      y: 0,
    })
  }

  return new SpineItemPosition({
    x: ltrRelativeOffset,
    y: 0,
  })
}
