/**
 * Offer extra convenient methods for navigation.
 */
import { EnhancerOptions, EnhancerOutput, RootEnhancer } from "./types/enhancer"

export const navigationEnhancer =
  <InheritOptions extends EnhancerOptions<RootEnhancer>, InheritOutput extends EnhancerOutput<RootEnhancer>>(
    next: (options: InheritOptions) => InheritOutput
  ) =>
  (
    options: InheritOptions
  ): InheritOutput & {
    goToLeftSpineItem: () => void
    goToRightSpineItem: () => void
  } => {
    const reader = next(options)

    const goToNextSpineItem = () => {
      const focusedSpineItemIndex = reader.getFocusedSpineItemIndex() || 0
      const { end = focusedSpineItemIndex } =
        reader.locator.getSpineItemsFromReadingOrderPosition(reader.getCurrentNavigationPosition()) || {}
      const numberOfSpineItems = reader.context.getManifest()?.spineItems.length ?? 0
      const nextItem = end + 1
      if (nextItem < numberOfSpineItems) {
        reader.goToSpineItem(nextItem)
      }
    }

    const goToPreviousSpineItem = () => {
      const focusedSpineItemIndex = reader.getFocusedSpineItemIndex() || 0
      const { begin = focusedSpineItemIndex } =
        reader.locator.getSpineItemsFromReadingOrderPosition(reader.getCurrentNavigationPosition()) || {}
      const nextItem = begin - 1

      if (nextItem >= 0) {
        reader.goToSpineItem(nextItem)
      }
    }

    return {
      ...reader,
      goToLeftSpineItem: () => {
        if (reader.context.isRTL()) {
          return goToNextSpineItem()
        }

        return goToPreviousSpineItem()
      },
      goToRightSpineItem: () => {
        if (reader.context.isRTL()) {
          return goToPreviousSpineItem()
        }

        return goToNextSpineItem()
      },
    }
  }
