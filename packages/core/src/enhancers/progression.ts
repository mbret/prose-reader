import { first, map, type Observable } from "rxjs"
import type { Context } from "../context/Context"
import type { Reader } from "../reader"
import type { SpineItem } from "../spineItem/SpineItem"

/**
 * Help dealing with progression through the book
 */
export const progressionEnhancer =
  <InheritOptions, InheritOutput extends Reader>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (
    options: InheritOptions,
  ): InheritOutput & {
    progression: {
      getPercentageEstimate: (
        context: Context,
        currentSpineIndex: number,
        numberOfPages: number,
        pageIndex: number,
        currentPosition: { x: number; y: number },
        currentItem: SpineItem,
      ) => Observable<number>
      getScrollPercentageWithinItem: (
        context: Context,
        currentPosition: { x: number; y: number },
        currentItem: SpineItem,
      ) => number
    }
  } => {
    const reader = next(options)

    const getPercentageEstimate = (
      context: Context,
      currentSpineIndex: number,
      numberOfPages: number,
      pageIndex: number,
      currentPosition: { x: number; y: number },
      currentItem: SpineItem,
    ) => {
      return currentItem.isReady$.pipe(
        first(),
        map((itemIsReady) => {
          const isGloballyPrePaginated =
            context.manifest?.renditionLayout === `pre-paginated`
          const readingOrderLength = context.manifest?.spineItems.length || 0
          const estimateBeforeThisItem =
            context.manifest?.spineItems
              .slice(0, currentSpineIndex)
              .reduce((acc, item) => acc + (item.progressionWeight ?? 0), 0) ||
            0
          const currentItemWeight =
            context.manifest?.spineItems[currentSpineIndex]
              ?.progressionWeight || 0
          // const nextItem = context.manifest.readingOrder[currentSpineIndex + 1]
          // const nextItemWeight = nextItem ? nextItem.progressionWeight : 1
          // const progressWeightGap = (currentItemWeight + estimateBeforeThisItem) - estimateBeforeThisItem

          let progressWithinThisItem =
            (pageIndex + 1) * (currentItemWeight / numberOfPages)

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
                context,
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
            pageIndex === numberOfPages - 1 &&
            totalProgress > 0.99
          ) {
            return 1
          }

          return totalProgress
        }),
      )
    }

    const getTotalProgressFromPercentages = (
      estimateBeforeThisItem: number,
      currentItemWeight: number,
      progressWithinThisItem: number,
    ) => {
      return estimateBeforeThisItem + currentItemWeight * progressWithinThisItem
    }

    const getScrollPercentageWithinItem = (
      context: Context,
      currentPosition: { x: number; y: number },
      currentItem: SpineItem,
    ) => {
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
          (currentPosition.x - left + context.state.visibleAreaRect.width) /
            width,
        ),
      )
    }

    return {
      ...reader,
      progression: {
        getPercentageEstimate,
        getScrollPercentageWithinItem,
      },
    }
  }
