import type { ViewportSlicePosition } from "../../viewport/types"

const isItemVisibleByThresholdForPosition = ({
  itemHeight,
  itemWidth,
  visibleWidthOfItem,
  visibleHeightOfItem,
  threshold,
}: {
  itemWidth: number
  visibleWidthOfItem: number
  visibleHeightOfItem: number
  itemHeight: number
  threshold: number
}) => {
  const visibleWidthRatioOfSpineItem = visibleWidthOfItem / itemWidth

  const visibleHeightRatioOfSpineItem = visibleHeightOfItem / itemHeight

  const isItemVisibleEnough =
    visibleWidthRatioOfSpineItem >= threshold &&
    visibleHeightRatioOfSpineItem >= threshold

  return isItemVisibleEnough
}

const isItemVisibleOnScreenByThresholdForPosition = ({
  visibleWidthOfItem,
  visibleHeightOfItem,
  threshold,
  viewportPosition,
}: {
  visibleWidthOfItem: number
  visibleHeightOfItem: number
  threshold: number
  viewportPosition: ViewportSlicePosition
}) => {
  const widthRatioOfSpaceTakenInScreen =
    visibleWidthOfItem / viewportPosition.width

  const heightRatioOfSpaceTakenInScreen =
    visibleHeightOfItem / viewportPosition.height

  const isItemVisibleEnoughOnScreen =
    heightRatioOfSpaceTakenInScreen >= threshold &&
    widthRatioOfSpaceTakenInScreen >= threshold

  return isItemVisibleEnoughOnScreen
}

/**
 * Will check whether a spine item is visible on screen
 * by either:
 *
 * - reach the threshold of visibility on screen
 * - reach the threshold of visibility relative to itself
 *
 * This cover the items that are completely visible on screen
 * but too small to reach the threshold of visibility on screen.
 * (we see them entirely but they are maybe too small on screen).
 *
 * Then will cover items that are cut on screen but we see them enough
 * on the screen to consider them.
 */
export const getItemVisibilityForPosition = ({
  itemPosition: {
    bottom,
    left,
    right,
    top,
    width: itemWidth,
    height: itemHeight,
  },
  threshold,
  viewportPosition,
  restrictToScreen,
}: {
  itemPosition: {
    right: number
    left: number
    bottom: number
    top: number
    height: number
    width: number
  }
  viewportPosition: ViewportSlicePosition
  threshold: number
  restrictToScreen?: boolean
}) => {
  const viewportLeft = viewportPosition.x
  const viewportRight = viewportPosition.x + (viewportPosition.width - 1)

  const viewportTop = viewportPosition.y
  const viewportBottom = Math.max(
    viewportPosition.y + (viewportPosition.height - 1),
    0,
  )

  const visibleWidthOfItem = Math.max(
    0,
    Math.min(right, viewportRight) - Math.max(left, viewportLeft),
  )

  const visibleHeightOfItem = Math.max(
    0,
    Math.min(bottom, viewportBottom) - Math.max(top, viewportTop),
  )

  const itemIsOnTheOuterEdge =
    visibleWidthOfItem <= 0 || visibleHeightOfItem <= 0

  // const thresholdValidRightEdge = viewportRight - viewportWidth * threshold
  // const thresholdValidLeftEdge = viewportLeft + viewportWidth * threshold

  if (itemIsOnTheOuterEdge) return { visible: false }

  const isItemVisibleEnoughOnScreen =
    isItemVisibleOnScreenByThresholdForPosition({
      threshold,
      visibleHeightOfItem,
      visibleWidthOfItem,
      viewportPosition,
    })

  if (restrictToScreen) {
    return { visible: isItemVisibleEnoughOnScreen }
  }

  const isItemVisibleEnough = isItemVisibleByThresholdForPosition({
    itemHeight,
    itemWidth,
    threshold,
    visibleHeightOfItem,
    visibleWidthOfItem,
  })

  return {
    visible: isItemVisibleEnough || isItemVisibleEnoughOnScreen,
  }
}
