import { first, map, withLatestFrom } from "rxjs"
import type { Reader } from "../../reader"
import type { SpineItem } from "../../spineItem/SpineItem"

const getTotalProgressFromPercentages = (
  estimateBeforeThisItem: number,
  currentItemWeight: number,
  progressWithinThisItem: number,
) => {
  return estimateBeforeThisItem + currentItemWeight * progressWithinThisItem
}

const getScrollPercentageWithinItem = (
  reader: Reader,
  currentPosition: { x: number; y: number },
  currentItem: SpineItem,
) => {
  const context = reader.context
  const { height, width } = currentItem.getElementDimensions()

  const { top, left } =
    reader.spine.spineLayout.getAbsolutePositionOf(currentItem)

  if (reader.settings.values.computedPageTurnDirection === `vertical`) {
    return Math.max(
      0,
      Math.min(
        1,
        (currentPosition.y - top + context.state.visibleAreaRect.height) /
          height,
      ),
    )
  }
  return Math.max(
    0,
    Math.min(
      1,
      (currentPosition.x - left + context.state.visibleAreaRect.width) / width,
    ),
  )
}

export const getPercentageEstimate = (
  reader: Reader,
  currentSpineIndex: number,
  pageIndex: number,
  currentPosition: { x: number; y: number },
  currentItem: SpineItem,
) => {
  return currentItem.isReady$.pipe(
    first(),
    withLatestFrom(reader.layoutInfo$),
    map(([itemIsReady, layout]) => {
      const context = reader.context

      const isGloballyPrePaginated =
        context.manifest?.renditionLayout === `pre-paginated`
      const readingOrderLength = context.manifest?.spineItems.length || 0
      const estimateBeforeThisItem =
        context.manifest?.spineItems
          .slice(0, currentSpineIndex)
          .reduce((acc, item) => acc + (item.progressionWeight ?? 0), 0) || 0
      const itemIndexNumber =
        reader.spineItemsManager.getSpineItemIndex(currentItem) ?? 0

      const numberOfSpineItems = reader.context.manifest?.spineItems.length ?? 0

      const spineItemNumberOfPages =
        layout.pages.filter((page) => page.itemIndex === itemIndexNumber)
          .length ?? 0

      const currentItemWeight =
        context.manifest?.spineItems[currentSpineIndex]?.progressionWeight ??
        // if no progressionWeight is defined we "assume" the document weight to be
        // relative to the total number of documents
        (itemIndexNumber + 1) / numberOfSpineItems

      let progressWithinThisItem =
        (pageIndex + 1) * (currentItemWeight / spineItemNumberOfPages)

      if (
        !isGloballyPrePaginated &&
        currentItem.renditionLayout === `reflowable` &&
        !itemIsReady
      ) {
        progressWithinThisItem = 0
      }

      let totalProgress = estimateBeforeThisItem + progressWithinThisItem

      if (context.manifest?.renditionFlow === `scrolled-continuous`) {
        if (itemIsReady) {
          progressWithinThisItem = getScrollPercentageWithinItem(
            reader,
            currentPosition,
            currentItem,
          )
        } else {
          // that way we avoid having a progress of 1 just because the item is not loaded and cover all screen due to smaller size.
          // Therefore it effectively prevent jump from 30% to 25% for example.
          progressWithinThisItem = 0
        }
        totalProgress = getTotalProgressFromPercentages(
          estimateBeforeThisItem,
          currentItemWeight,
          progressWithinThisItem,
        )
      }

      // because the rounding of weight use a lot of decimals we will end up with
      // something like 0.999878 for the last page
      if (
        currentSpineIndex === readingOrderLength - 1 &&
        pageIndex === spineItemNumberOfPages - 1 &&
        totalProgress > 0.99
      ) {
        return 1
      }

      return totalProgress
    }),
  )
}
