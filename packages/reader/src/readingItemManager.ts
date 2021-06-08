import { Subject, Subscription } from "rxjs"
import { Report } from "./report"
import { Context } from "./context"
import { ReadingItem } from "./readingItem"

export type ReadingItemManager = ReturnType<typeof createReadingItemManager>

const NAMESPACE = `readingItemManager`

export const createReadingItemManager = ({ context }: { context: Context }) => {
  const subject = new Subject<{ event: 'focus', data: ReadingItem } | { event: 'layout' }>()
  let orderedReadingItems: ReadingItem[] = []
  /**
   * focused item represent the current item that the user navigated to.
   * It can be either the left or right page for a spread, not necessarily the begin item
   * either. This focused item is very important for everything that is related to navigation
   * and adjustment of viewport.
   * 
   * @important
   * The focused item can sometime not be visible on the screen, in case of a viewport misalignment.
   * However it means the next adjustment will use the focused item to detect when to move the viewport.
   */
  let focusedReadingItemIndex: number | undefined = undefined
  let readingItemSubscriptions: Subscription[] = []

  const layout = () => {
    orderedReadingItems.reduce((edgeOffset, item) => {
      const { width } = item.layout()
      item.adjustPositionOfElement(edgeOffset)

      return width + edgeOffset
    }, 0)

    subject.next({ event: 'layout' })
  }

  const adjustPositionOfItems = () => {
    orderedReadingItems.reduce((edgeOffset, item) => {
      const itemWidth = item.getElementDimensions().width
      item.adjustPositionOfElement(edgeOffset)

      return itemWidth + edgeOffset
    }, 0)

    subject.next({ event: 'layout' })
  }

  const focus = (indexOrReadingItem: number | ReadingItem) => {
    const readingItemToFocus = typeof indexOrReadingItem === `number` ? get(indexOrReadingItem) : indexOrReadingItem

    if (!readingItemToFocus) return

    const newActiveReadingItemIndex = orderedReadingItems.indexOf(readingItemToFocus)

    if (newActiveReadingItemIndex === focusedReadingItemIndex) return
    
    focusedReadingItemIndex = newActiveReadingItemIndex

    subject.next({ event: 'focus', data: readingItemToFocus })
  }

  const loadContents = Report.measurePerformance(`loadContents`, 10, () => {
    const numberOfAdjacentSpineItemToPreLoad = context.getLoadOptions()?.numberOfAdjacentSpineItemToPreLoad || 0
    orderedReadingItems.forEach((orderedReadingItem, index) => {
      if (activeReadingItemIndex !== undefined) {
        if (index < (activeReadingItemIndex - numberOfAdjacentSpineItemToPreLoad) || index > (activeReadingItemIndex + numberOfAdjacentSpineItemToPreLoad)) {
          orderedReadingItem.unloadContent()
        } else {
          if (!orderedReadingItem.isFrameReady()) {
            orderedReadingItem.loadContent()
          }
        }
      }
    })
  })

  const get = (indexOrId: number | string) => {
    if (typeof indexOrId === `number`) return orderedReadingItems[indexOrId]

    return orderedReadingItems.find(({ item }) => item.id === indexOrId)
  }

  /**
   * It's important to not use x,y since we need the absolute position of each element. Otherwise x,y would be relative to
   * current window (viewport).
   */
  const getAbsolutePositionOf = Report.measurePerformance(`getAbsolutePositionOf`, 10, (readingItemOrIndex: ReadingItem | number) => {
    const indexOfItem = typeof readingItemOrIndex === 'number' ? readingItemOrIndex : orderedReadingItems.indexOf(readingItemOrIndex)

    const distance = orderedReadingItems.slice(0, indexOfItem + 1).reduce((acc, readingItem) => {
      return {
        start: acc.end,
        end: acc.end + (readingItem.getElementDimensions()?.width || 0)
      }
    }, { start: 0, end: 0 })

    if (typeof readingItemOrIndex === 'number') {
      return {
        ...get(readingItemOrIndex)?.getElementDimensions(),
        ...distance
      }
    }

    return {
      ...readingItemOrIndex.getElementDimensions(),
      ...distance
    }
  }, { disable: true })

  const getFocusedReadingItem = () => focusedReadingItemIndex !== undefined ? orderedReadingItems[focusedReadingItemIndex] : undefined

  const comparePositionOf = (toCompare: ReadingItem, withItem: ReadingItem) => {
    const isAfter = orderedReadingItems.indexOf(toCompare) > orderedReadingItems.indexOf(withItem)

    if (isAfter) {
      return 'after'
    }

    return 'before'
  }

  const destroy = () => {
    orderedReadingItems.forEach(item => item.destroy())
    readingItemSubscriptions.forEach(subscription => subscription.unsubscribe())
    readingItemSubscriptions = []
  }

  function getReadingItemIndex(readingItem: ReadingItem | undefined) {
    if (!readingItem) return undefined
    const index = orderedReadingItems.indexOf(readingItem)

    return index < 0 ? undefined : index
  }

  const add = (readingItem: ReadingItem) => {
    orderedReadingItems.push(readingItem)

    const readingItemSubscription = readingItem.$.subscribe((event) => {
      if (event.event === 'layout') {
        // @todo at this point the inner item has an upstream layout so we only need to adjust
        // left/right position of it. We don't need to layout, maybe a `adjustPositionOfItems()` is enough
        adjustPositionOfItems()
      }
    })

    readingItemSubscriptions.push(readingItemSubscription)

    readingItem.load()
  }

  const getAll = () => orderedReadingItems

  const getLength = () => {
    return orderedReadingItems.length
  }

  const getFocusedReadingItemIndex = () => {
    const item = getFocusedReadingItem()
    return item && getReadingItemIndex(item)
  }

  const getReadingItemAtOffset = Report.measurePerformance(`getReadingItemAtOffset`, 10, (offset: number) => {
    const detectedItem = orderedReadingItems.find(item => {
      const { start, end } = getAbsolutePositionOf(item)
      return offset >= start && offset < end
    })

    if (offset === 0 && !detectedItem) return orderedReadingItems[0]

    if (!detectedItem) {
      return getFocusedReadingItem()
    }

    return detectedItem || getFocusedReadingItem()
  })

  return {
    add,
    get,
    getAll,
    getLength,
    layout,
    focus,
    loadContents,
    comparePositionOf,
    getAbsolutePositionOf,
    getReadingItemAtOffset,
    getFocusedReadingItem,
    getFocusedReadingItemIndex,
    getReadingItemIndex,
    destroy,
    $: subject.asObservable()
  }
}

