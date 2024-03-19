import { BehaviorSubject, merge, Subject } from "rxjs"
import { tap, takeUntil, switchMap, map } from "rxjs/operators"
import { Report } from "./report"
import { Context } from "./context"
import { SpineItem } from "./spineItem/createSpineItem"
import { isShallowEqual } from "./utils/objects"

const NAMESPACE = `spineItemManager`

export const createSpineItemManager = ({ context }: { context: Context }) => {
  const focus$ = new Subject<{ data: SpineItem }>()
  const layout$ = new Subject<boolean>()
  /**
   * This contains every item dimension / position on the viewport.
   * This is only used to avoid intensively request bounding of each items later.
   * This is always in sync with every layout since it is being updated for every layout
   * done with the manager.
   */
  let itemLayoutInformation: {
    left: number
    right: number
    top: number
    bottom: number
    width: number
    height: number
  }[] = []
  const orderedSpineItemsSubject$ = new BehaviorSubject<SpineItem[]>([])
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
  let focusedSpineItemIndex: number | undefined

  /**
   * @todo
   * move this logic to the spine
   *
   * @todo
   * make sure to check how many times it is being called and try to reduce number of layouts
   * it is called eery time an item is being unload (which can adds up quickly for big books)
   */
  const layout = () => {
    const manifest = context.getManifest()
    const newItemLayoutInformation: typeof itemLayoutInformation = []
    const isGloballyPrePaginated = manifest?.renditionLayout === `pre-paginated`

    orderedSpineItemsSubject$.value.reduce(
      ({ horizontalOffset, verticalOffset }, item, index) => {
        let minimumWidth = context.getPageSize().width
        let blankPagePosition: `none` | `before` | `after` = `none`
        const itemStartOnNewScreen = horizontalOffset % context.getVisibleAreaRect().width === 0
        const isLastItem = index === orderedSpineItemsSubject$.value.length - 1

        if (context.shouldDisplaySpread()) {
          /**
           * for now every reflowable content that has reflow siblings takes the entire screen by default
           * this simplify many things and I am not sure the specs allow one reflow
           * to end and an other one to start on the same screen anyway
           *
           * @important
           * For now this is impossible to have reflow not taking all screen. This is because
           * when an element is unloaded, the next element will move back its x axis, then an adjustment
           * will occurs and the previous element will become visible again, meaning it will be loaded,
           * therefore pushing the focused element, meaning adjustment again, then unload of previous one,
           * ... infinite loop. Due to the nature of reflow it's pretty much impossible to not load the entire
           * book with spread on to make it work.
           *
           * @important
           * When the book is globally pre-paginated we will not apply any of this even if each item is
           * reflowable. This is mostly a publisher mistake but does not comply with spec. Therefore
           * we ignore it
           */
          if (!isGloballyPrePaginated && item.item.renditionLayout === `reflowable` && !isLastItem) {
            minimumWidth = context.getPageSize().width * 2
          }

          // mainly to make loading screen looks good
          if (!isGloballyPrePaginated && item.item.renditionLayout === `reflowable` && isLastItem && itemStartOnNewScreen) {
            minimumWidth = context.getPageSize().width * 2
          }

          const lastItemStartOnNewScreenInAPrepaginatedBook = itemStartOnNewScreen && isLastItem && isGloballyPrePaginated

          if (item.item.pageSpreadRight && itemStartOnNewScreen && !context.isRTL()) {
            blankPagePosition = `before`
            minimumWidth = context.getPageSize().width * 2
          } else if (item.item.pageSpreadLeft && itemStartOnNewScreen && context.isRTL()) {
            blankPagePosition = `before`
            minimumWidth = context.getPageSize().width * 2
          } else if (lastItemStartOnNewScreenInAPrepaginatedBook) {
            if (context.isRTL()) {
              blankPagePosition = `before`
            } else {
              blankPagePosition = `after`
            }
            minimumWidth = context.getPageSize().width * 2
          }
        }

        // we trigger an item layout which will update the visual and return
        // us with the item new eventual layout information.
        // This step is not yet about moving item or adjusting position.
        const { width, height } = item.layout({
          minimumWidth,
          blankPagePosition,
          spreadPosition: context.shouldDisplaySpread()
            ? itemStartOnNewScreen
              ? context.isRTL()
                ? `right`
                : `left`
              : context.isRTL()
                ? `left`
                : `right`
            : `none`,
        })

        if (context.getSettings().computedPageTurnDirection === `vertical`) {
          const currentValidEdgeYForVerticalPositioning = itemStartOnNewScreen
            ? verticalOffset
            : verticalOffset - context.getVisibleAreaRect().height
          const currentValidEdgeXForVerticalPositioning = itemStartOnNewScreen ? 0 : horizontalOffset

          if (context.isRTL()) {
            item.adjustPositionOfElement({
              top: currentValidEdgeYForVerticalPositioning,
              left: currentValidEdgeXForVerticalPositioning,
            })
          } else {
            item.adjustPositionOfElement({
              top: currentValidEdgeYForVerticalPositioning,
              left: currentValidEdgeXForVerticalPositioning,
            })
          }

          const newEdgeX = width + currentValidEdgeXForVerticalPositioning
          const newEdgeY = height + currentValidEdgeYForVerticalPositioning

          newItemLayoutInformation.push({
            left: currentValidEdgeXForVerticalPositioning,
            right: newEdgeX,
            top: currentValidEdgeYForVerticalPositioning,
            bottom: newEdgeY,
            height,
            width,
          })

          return {
            horizontalOffset: newEdgeX,
            verticalOffset: newEdgeY,
          }
        }

        // We can now adjust the position of the item if needed based on its new layout.
        // For simplification we use an edge offset, which means for LTR it will be x from left and for RTL
        // it will be x from right
        item.adjustPositionOfElement(context.isRTL() ? { right: horizontalOffset, top: 0 } : { left: horizontalOffset, top: 0 })

        newItemLayoutInformation.push({
          ...(context.isRTL()
            ? {
                left: context.getVisibleAreaRect().width - horizontalOffset - width,
                right: context.getVisibleAreaRect().width - horizontalOffset,
              }
            : {
                left: horizontalOffset,
                right: horizontalOffset + width,
              }),
          top: verticalOffset,
          bottom: height,
          height,
          width,
        })

        return {
          horizontalOffset: horizontalOffset + width,
          verticalOffset: 0,
        }
      },
      { horizontalOffset: 0, verticalOffset: 0 },
    )

    const hasLayoutChanges = itemLayoutInformation.some((old, index) => !isShallowEqual(old, newItemLayoutInformation[index]))

    itemLayoutInformation = newItemLayoutInformation

    Report.log(NAMESPACE, `layout`, { hasLayoutChanges, itemLayoutInformation })

    layout$.next(hasLayoutChanges)
  }

  const focus = (indexOrSpineItem: number | SpineItem) => {
    const spineItemToFocus = typeof indexOrSpineItem === `number` ? get(indexOrSpineItem) : indexOrSpineItem

    if (!spineItemToFocus) return

    const newActiveSpineItemIndex = orderedSpineItemsSubject$.value.indexOf(spineItemToFocus)

    if (newActiveSpineItemIndex === focusedSpineItemIndex) return

    focusedSpineItemIndex = newActiveSpineItemIndex

    focus$.next({ data: spineItemToFocus })
  }

  /**
   * @todo
   * optimize useless calls to it, such as when the layout has not changed and the focus is still the same
   * @todo
   * analyze poor performances
   */
  const loadContents = Report.measurePerformance(`loadContents`, 10, (rangeOfIndex: [number, number]) => {
    const [leftIndex, rightIndex] = rangeOfIndex
    const numberOfAdjacentSpineItemToPreLoad = context.getSettings().numberOfAdjacentSpineItemToPreLoad
    const isPrePaginated = context.getManifest()?.renditionLayout === `pre-paginated`
    const isUsingFreeScroll = context.getSettings().computedPageTurnMode === `scrollable`

    orderedSpineItemsSubject$.value.forEach((orderedSpineItem, index) => {
      const isBeforeFocusedWithPreload =
        // we never want to preload anything before on free scroll on flow because it could offset the cursor
        index < leftIndex && !isPrePaginated && isUsingFreeScroll ? true : index < leftIndex - numberOfAdjacentSpineItemToPreLoad
      const isAfterTailWithPreload = index > rightIndex + numberOfAdjacentSpineItemToPreLoad
      if (!isBeforeFocusedWithPreload && !isAfterTailWithPreload) {
        orderedSpineItem.loadContent()
      } else {
        orderedSpineItem.unloadContent()
      }
    })
  })

  const get = (indexOrId: number | string) => {
    if (typeof indexOrId === `number`) {
      return orderedSpineItemsSubject$.value[indexOrId]
    }

    return orderedSpineItemsSubject$.value.find(({ item }) => item.id === indexOrId)
  }

  /**
   * It's important to not use x,y since we need the absolute position of each element. Otherwise x,y would be relative to
   * current window (viewport).
   */
  const getAbsolutePositionOf = (spineItemOrIndex: SpineItem | number) => {
    const indexOfItem =
      typeof spineItemOrIndex === `number` ? spineItemOrIndex : orderedSpineItemsSubject$.value.indexOf(spineItemOrIndex)

    const layoutInformation = itemLayoutInformation[indexOfItem]

    return (
      layoutInformation || {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        width: 0,
        height: 0,
      }
    )
  }

  const getFocusedSpineItem = () =>
    focusedSpineItemIndex !== undefined ? orderedSpineItemsSubject$.value[focusedSpineItemIndex] : undefined

  const comparePositionOf = (toCompare: SpineItem, withItem: SpineItem) => {
    const isAfter = orderedSpineItemsSubject$.value.indexOf(toCompare) > orderedSpineItemsSubject$.value.indexOf(withItem)

    if (isAfter) {
      return `after`
    }

    return `before`
  }

  const getSpineItemIndex = (spineItem: SpineItem | undefined) => {
    if (!spineItem) return undefined
    const index = orderedSpineItemsSubject$.value.indexOf(spineItem)

    return index < 0 ? undefined : index
  }

  const add = (spineItem: SpineItem) => {
    orderedSpineItemsSubject$.value.push(spineItem)

    spineItem.$.contentLayout$.pipe(takeUntil(context.$.destroy$)).subscribe(() => {
      // upstream change, meaning we need to layout again to both resize correctly each item but also to
      // adjust positions, etc
      layout()
    })

    spineItem.$.loaded$
      .pipe(
        tap(() => {
          if (spineItem.isUsingVerticalWriting()) {
            context.setHasVerticalWriting()
          }
        }),
        takeUntil(context.$.destroy$),
      )
      .subscribe()

    spineItem.load()
  }

  const getAll = () => orderedSpineItemsSubject$.value

  const getLength = () => {
    return orderedSpineItemsSubject$.value.length
  }

  const getFocusedSpineItemIndex = () => {
    const item = getFocusedSpineItem()
    return item && getSpineItemIndex(item)
  }

  /**
   * @todo handle reload, remove subscription to each items etc. See add()
   */
  const destroyItems = () => {
    orderedSpineItemsSubject$.value.forEach((item) => item.destroy())
  }

  const destroy = () => {
    destroyItems()
    focus$.complete()
    layout$.complete()
  }

  return {
    destroyItems,
    add,
    get,
    getAll,
    getLength,
    layout,
    focus,
    loadContents,
    comparePositionOf,
    getAbsolutePositionOf,
    getFocusedSpineItem,
    getFocusedSpineItemIndex,
    getSpineItemIndex,
    destroy,
    $: {
      focus$: focus$.asObservable(),
      layout$: layout$.asObservable(),
      itemIsReady$: orderedSpineItemsSubject$.asObservable().pipe(
        switchMap((items) => {
          const itemsIsReady$ = items.map((item) => item.$.isReady$.pipe(map((isReady) => ({ item: item.item, isReady }))))

          return merge(...itemsIsReady$)
        }),
      ),
    },
  }
}

export type SpineItemManager = ReturnType<typeof createSpineItemManager>
