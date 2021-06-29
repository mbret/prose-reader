import { Subject, Subscription } from "rxjs"
import { Report } from "./report"
import { Context } from "./context"
import { ReadingItem } from "./readingItem"

export type ReadingItemManager = ReturnType<typeof createReadingItemManager>
export type ViewportPosition = { x: number, y: number }

const NAMESPACE = `readingItemManager`

export const createReadingItemManager = ({ context }: { context: Context }) => {
  const focus$ = new Subject<{ data: ReadingItem }>()
  const layout$ = new Subject()
  /**
   * This contains every item dimension / position on the viewport.
   * This is only used to avoid intensively request bounding of each items later.
   * This is always in sync with every layout since it is being updated for every layout
   * done with the manager.
   */
  let itemLayoutInformation: { leftStart: number, leftEnd: number, topStart: number, topEnd: number, width: number, height: number }[] = []
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

  /**
   * @todo
   * make sure to check how many times it is being called and try to reduce number of layouts
   */
  const layout = () => {
    itemLayoutInformation = []

    orderedReadingItems.reduce((edgeOffset, item, index) => {
      let minimumWidth = context.getPageSize().width
      let blankPagePosition: `none` | `before` | `after` = `none`
      const itemStartOnNewScreen = edgeOffset.edgeX % context.getVisibleAreaRect().width === 0

      if (context.shouldDisplaySpread()) {
        /**
         * for now every reflowable content that has reflow siblings takes the entire screen by default
         * this simplify many things and I am not sure the specs allow one reflow
         * to end and an other one to start on the same screen anyway
         * 
         * @important
         * For now this is impossible to have reflow not taking all screen. This is because
         * when an element is unloaded, the next element will move back its x, then an adjustment
         *  will occurs and the previous element will become visible again, meaning it will be loaded,
         * therefore pushing the focused element, meaning adjustment again, then unload of previous one,
         * ... infinite loop. Due to the nature of reflow it's pretty much impossible to not load the entire
         * book with spread on to make it work.
         */
        if (item.isReflowable && index !== orderedReadingItems.length - 1) {
          minimumWidth = context.getPageSize().width * 2
        }

        // mainly to make loading screen looks good
        if (item.isReflowable && index === orderedReadingItems.length - 1 && itemStartOnNewScreen) {
          minimumWidth = context.getPageSize().width * 2
        }

        if (item.item.pageSpreadRight && itemStartOnNewScreen && !context.isRTL()) {
          blankPagePosition = `before`
          minimumWidth = context.getPageSize().width * 2
        }

        if (item.item.pageSpreadLeft && itemStartOnNewScreen && context.isRTL()) {
          blankPagePosition = `before`
          minimumWidth = context.getPageSize().width * 2
        }
      }

      const { width, height } = item.layout({ minimumWidth, blankPagePosition })

      if (context.getSettings().pageTurnDirection === `vertical`) {
        const currentValidEdgeYForVerticalPositioning = itemStartOnNewScreen ? edgeOffset.edgeY : edgeOffset.edgeY - context.getVisibleAreaRect().height
        const currentValidEdgeXForVerticalPositioning = itemStartOnNewScreen ? 0 : edgeOffset.edgeX

        // console.log({ edgeOffset, currentValidEdgeYForVerticalPositioning, currentValidEdgeXForVerticalPositioning, itemStartOnNewScreen })

        if (context.isRTL()) {
          item.adjustPositionOfElement({ top: edgeOffset.edgeY })
        } else {
          item.adjustPositionOfElement({
            top: currentValidEdgeYForVerticalPositioning,
            left: currentValidEdgeXForVerticalPositioning,
          })
        }

        const newEdgeX = width + currentValidEdgeXForVerticalPositioning
        const newEdgeY = height + currentValidEdgeYForVerticalPositioning

        itemLayoutInformation.push({
          leftStart: currentValidEdgeXForVerticalPositioning,
          leftEnd: newEdgeX,
          topStart: currentValidEdgeYForVerticalPositioning,
          topEnd: newEdgeY,
          height,
          width,
        })

        return {
          edgeX: newEdgeX,
          edgeY: newEdgeY
        }
      }

      if (context.isRTL()) {
        // could also be negative left but I am not in the mood
        // will push items on the left
        item.adjustPositionOfElement({ right: edgeOffset.edgeX, top: 0 })
      } else {
        // will push items on the right
        item.adjustPositionOfElement({ left: edgeOffset.edgeX, top: 0 })
      }

      const newEdgeX = width + edgeOffset.edgeX

      itemLayoutInformation.push({
        leftStart: edgeOffset.edgeX,
        leftEnd: newEdgeX,
        topStart: edgeOffset.edgeY,
        topEnd: height,
        height,
        width,
      })

      return {
        edgeX: newEdgeX,
        edgeY: 0
      }
    }, { edgeX: 0, edgeY: 0 })

    layout$.next()
  }

  const focus = (indexOrReadingItem: number | ReadingItem) => {
    const readingItemToFocus = typeof indexOrReadingItem === `number` ? get(indexOrReadingItem) : indexOrReadingItem

    if (!readingItemToFocus) return

    const newActiveReadingItemIndex = orderedReadingItems.indexOf(readingItemToFocus)

    if (newActiveReadingItemIndex === focusedReadingItemIndex) return

    focusedReadingItemIndex = newActiveReadingItemIndex

    focus$.next({ data: readingItemToFocus })
  }

  /**
   * @todo
   * optimize useless calls to it, such as when the layout has not changed and the focus is still the same
   * @todo 
   * analyze poor performances
   */
  const loadContents = Report.measurePerformance(`loadContents`, 10, (rangeOfIndex: [number, number]) => {
    const [leftIndex, rightIndex] = rangeOfIndex
    const numberOfAdjacentSpineItemToPreLoad = context.getLoadOptions()?.numberOfAdjacentSpineItemToPreLoad || 0
    orderedReadingItems.forEach((orderedReadingItem, index) => {
      const isBeforeFocusedWithPreload = index < (leftIndex - numberOfAdjacentSpineItemToPreLoad)
      const isAfterTailWithPreload = index > (rightIndex + numberOfAdjacentSpineItemToPreLoad)
      if (!isBeforeFocusedWithPreload && !isAfterTailWithPreload && !orderedReadingItem.isFrameReady() && !orderedReadingItem.isFrameLoading()) {
        orderedReadingItem.loadContent()
      }
    })
  })

  const unloadContents = Report.measurePerformance(`loadContents`, 10, (rangeOfIndex: [number, number]) => {
    const [leftIndex, rightIndex] = rangeOfIndex
    const numberOfAdjacentSpineItemToPreLoad = context.getLoadOptions()?.numberOfAdjacentSpineItemToPreLoad || 0
    orderedReadingItems.forEach((orderedReadingItem, index) => {
      const isBeforeFocusedWithPreload = index < (leftIndex - numberOfAdjacentSpineItemToPreLoad)
      const isAfterTailWithPreload = index > (rightIndex + numberOfAdjacentSpineItemToPreLoad)
      if (isBeforeFocusedWithPreload || isAfterTailWithPreload) {
        orderedReadingItem.unloadContent()
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
    const pageTurnDirection = context.getSettings().pageTurnDirection
    const indexOfItem = typeof readingItemOrIndex === 'number' ? readingItemOrIndex : orderedReadingItems.indexOf(readingItemOrIndex)

    const layoutInformation = itemLayoutInformation[indexOfItem]

    if (!layoutInformation) {
      return { leftStart: 0, leftEnd: 0, topStart: 0, topEnd: 0, width: 0, height: 0 }
    }

    // const distance = orderedReadingItems
    //   .slice(0, indexOfItem + 1)
    //   .reduce((acc, readingItem) => {
    //     const { width, height } = readingItem.getElementDimensions()

    //     return {
    //       leftStart: pageTurnDirection === `horizontal` ? acc.leftEnd : 0,
    //       leftEnd: pageTurnDirection === `horizontal` ? acc.leftEnd + width : width,
    //       topStart: pageTurnDirection === `horizontal` ? 0 : acc.topEnd,
    //       topEnd: pageTurnDirection === `horizontal` ? height : acc.topEnd + height,
    //       width,
    //       height
    //     }
    //   }, { leftStart: 0, leftEnd: 0, topStart: 0, topEnd: 0, width: 0, height: 0 })

    // console.log(distance, itemLayoutInformation[indexOfItem])
    // return distance

    return itemLayoutInformation[indexOfItem] || { leftStart: 0, leftEnd: 0, topStart: 0, topEnd: 0, width: 0, height: 0 }

  }, { disable: true })

  const getFocusedReadingItem = () => focusedReadingItemIndex !== undefined ? orderedReadingItems[focusedReadingItemIndex] : undefined

  const comparePositionOf = (toCompare: ReadingItem, withItem: ReadingItem) => {
    const isAfter = orderedReadingItems.indexOf(toCompare) > orderedReadingItems.indexOf(withItem)

    if (isAfter) {
      return 'after'
    }

    return 'before'
  }

  function getReadingItemIndex(readingItem: ReadingItem | undefined) {
    if (!readingItem) return undefined
    const index = orderedReadingItems.indexOf(readingItem)

    return index < 0 ? undefined : index
  }

  const add = (readingItem: ReadingItem) => {
    orderedReadingItems.push(readingItem)

    const readingItemSubscription = readingItem.$.subscribe((event) => {
      if (event.event === 'contentLayoutChange') {
        // upstream change, meaning we need to layout again to both resize correctly each item but also to
        // adjust positions, etc
        layout()
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

  const getReadingItemAtPosition = Report.measurePerformance(`getReadingItemAtPosition`, 10, (position: ViewportPosition) => {
    const detectedItem = orderedReadingItems.find(item => {
      const { leftStart, leftEnd, topEnd, topStart } = getAbsolutePositionOf(item)

      // console.warn({ leftStart, leftEnd, topEnd, topStart }, position)
      const isWithinXAxis = position.x >= leftStart && position.x < leftEnd

      if (context.getSettings().pageTurnDirection === `horizontal`) {
        return isWithinXAxis
      } else {
        return isWithinXAxis && position.y >= topStart && position.y < topEnd
      }
    })

    if (position.x === 0 && !detectedItem) return orderedReadingItems[0]

    return detectedItem
  }, { disable: true })

  const destroy = () => {
    orderedReadingItems.forEach(item => item.destroy())
    readingItemSubscriptions.forEach(subscription => subscription.unsubscribe())
    readingItemSubscriptions = []
    focus$.complete()
    layout$.complete()
  }

  return {
    add,
    get,
    getAll,
    getLength,
    layout,
    focus,
    loadContents,
    unloadContents,
    comparePositionOf,
    getAbsolutePositionOf,
    getReadingItemAtPosition,
    getFocusedReadingItem,
    getFocusedReadingItemIndex,
    getReadingItemIndex,
    destroy,
    $: {
      focus$: focus$.asObservable(),
      layout$: layout$.asObservable(),
    }
  }
}

