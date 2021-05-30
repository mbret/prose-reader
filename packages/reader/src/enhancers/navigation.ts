import { Subscription } from "rxjs";
import { Enhancer } from "../createReader";

export const navigationEnhancer: Enhancer<{
  turnLeft: () => void,
  turnRight: () => void,
  goTo: (spineIndexOrIdOrCfi: number | string) => void,
  goToPageOfCurrentChapter: (pageIndex: number) => void,
  goToHref: (href: string) => void,
  goToLeftSpineItem: () => void,
  goToRightSpineItem: () => void,
}> = (next) => (options) => {
  const reader = next(options)

  let contextSubscription: Subscription | undefined
  let readerSubscription: Subscription | undefined

  const goToNextSpineItem = () => {
    const currentSpineIndex = reader.getFocusedReadingItemIndex() || 0
    const numberOfSpineItems = reader.context.getManifest()?.readingOrder.length || 1
    if (currentSpineIndex < (numberOfSpineItems - 1)) {
      reader.goTo(currentSpineIndex + 1)
    }
  }

  const goToPreviousSpineItem = () => {
    const currentSpineIndex = reader.getFocusedReadingItemIndex() || 0
    if (currentSpineIndex > 0) {
      reader.goTo(currentSpineIndex - 1)
    }
  }

  return {
    ...reader,
    destroy: () => {
      reader.destroy()
      contextSubscription?.unsubscribe()
      readerSubscription?.unsubscribe()
    },
    turnLeft: () => reader.turnLeft(),
    turnRight: () => reader.turnRight(),
    goTo: (spineIndexOrIdOrCfi: number | string) => reader.goTo(spineIndexOrIdOrCfi),
    goToPageOfCurrentChapter: (pageIndex: number) => reader.goToPageOfCurrentChapter(pageIndex),
    // goToPath: (path: string) => {
    //   const manifest = reader.context.manifest
    //   const foundItem = manifest?.readingOrder.find(item => item.path === path)
    //   if (foundItem) {
    //     reader.readingOrderView.goTo(foundItem.id)
    //   }
    // },
    goToHref: (href: string) => {
      reader.goToUrl(href)
    },
    // goToPageOfCurrentChapter: (pageIndex: number) => {
    //   return reader.readingOrderView.goToPageOfCurrentChapter(pageIndex)
    // },
    // goToNextSpineItem,
    // goToPreviousSpineItem,
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