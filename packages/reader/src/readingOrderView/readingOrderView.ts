import { animationFrameScheduler, BehaviorSubject, EMPTY, interval, merge, Subject, Subscription } from "rxjs"
import { catchError, debounce, debounceTime, distinctUntilChanged, filter, map, share, skip, switchMap, take, takeUntil, tap } from "rxjs/operators"
import { Report } from "../report"
import { Context } from "../context"
import { createViewportNavigator } from "./viewportNavigator/viewportNavigator"
import { Pagination } from "../pagination"
import { createReadingItem } from "../readingItem"
import { createLocationResolver as createReadingItemLocator } from "../readingItem/locationResolver"
import { ReadingItemManager } from "../readingItemManager"
import { createLocationResolver } from "./locationResolver"
import { createCfiLocator } from "./cfiLocator"
import { createEventsHelper } from "./eventsHelper"
import { createSelection } from "../selection"
import { ViewportNavigationEntry } from "./navigationResolver"
import { isShallowEqual } from "../utils/objects"
import { Hook } from "../types/Hook"

const NAMESPACE = `readingOrderView`

type ReadingItem = ReturnType<typeof createReadingItem>
type RequireLayout = boolean
type ManipulableReadingItemCallback = Parameters<ReadingItem[`manipulateReadingItem`]>[0]
type ManipulableReadingItemCallbackPayload = Parameters<ManipulableReadingItemCallback>[0]

type Event = { type: `onSelectionChange`, data: ReturnType<typeof createSelection> | null }

export const createReadingOrderView = ({ parentElement, context, pagination, iframeEventBridgeElement, readingItemManager, hooks$ }: {
  parentElement: HTMLElement,
  iframeEventBridgeElement: HTMLElement,
  context: Context,
  pagination: Pagination,
  readingItemManager: ReadingItemManager,
  hooks$: BehaviorSubject<Hook[]>
}) => {
  const layoutSubject$ = new Subject<void>()
  const subject = new Subject<Event>()
  const doc = parentElement.ownerDocument
  const containerElement = createContainerElement(doc, hooks$)
  parentElement.appendChild(containerElement)
  const readingItemLocator = createReadingItemLocator({ context })
  const locator = createLocationResolver({ context, readingItemManager, readingItemLocator })
  const cfiLocator = createCfiLocator({ readingItemManager, context, readingItemLocator })
  const viewportNavigator = createViewportNavigator({ context, pagination, readingItemManager, element: containerElement, cfiLocator, locator, hooks$ })
  const eventsHelper = createEventsHelper({ context, readingItemManager, iframeEventBridgeElement, locator })
  let selectionSubscription: Subscription | undefined

  const load = () => {
    context.getManifest()?.spineItems.map(async (resource) => {
      const readingItem = createReadingItem({
        item: resource,
        containerElement: containerElement,
        iframeEventBridgeElement,
        context,
        hooks$,
        viewportState$: viewportNavigator.$.state$
      })
      readingItemManager.add(readingItem)
    })
    hooks$.getValue().forEach(hook => {
      if (hook.name === `item.onCreated`) {
        readingItemManager.getAll().forEach(item => hook.fn({ container: item.element, loadingElement: item.loadingElement }))
      }
    })
  }

  const manipulateReadingItems = (cb: (payload: ManipulableReadingItemCallbackPayload & { index: number }) => RequireLayout) => {
    let shouldLayout = false
    readingItemManager.getAll().forEach((item, index) => {
      shouldLayout = item.manipulateReadingItem((opts) => cb({ index, ...opts })) || shouldLayout
    })

    if (shouldLayout) {
      readingItemManager.layout()
    }
  }

  /**
   * Watch for settings update that require changes
   * on this layer.
   *
   * @important
   * Try not to have duplicate with other lower components that also listen to settings change and re-layout
   * on the same settings.
   */
  const layoutOnSettingChanges$ = context.$.settings$
    .pipe(
      map(({ computedPageTurnDirection, computedPageTurnMode }) => ({
        computedPageTurnDirection,
        computedPageTurnMode
      })),
      distinctUntilChanged(isShallowEqual),
      skip(1)
    )

  const waitForViewportFree$ = viewportNavigator.$.state$.pipe(filter(v => v === `free`), take(1))

  const layout$ = merge(layoutSubject$, layoutOnSettingChanges$)
    .pipe(
      tap(() => {
        if (context.getSettings().computedPageTurnMode === `scrollable`) {
          containerElement.style.overflow = `hidden`
          containerElement.style.overflowY = `scroll`
        } else {
          containerElement.style.removeProperty(`overflow`)
          containerElement.style.removeProperty(`overflowY`)
        }

        viewportNavigator.layout()
        readingItemManager.layout()
      }),
      share()
    )

  layout$
    .pipe(
      takeUntil(context.$.destroy$)
    )
    .subscribe()

  /**
   * This adjustment is used to update the pagination with the most up to date values we can.
   * It needs to be ran only when viewport is free because some operation such as looking up cfi can
   * be really heavy.
   *
   * The cfi will only be updated if it needs to be:
   * - cfi is a root target
   * - cfi is undefined
   * - items are different
   */
  const adjustPagination$ = (position: ViewportNavigationEntry) => {
    return waitForViewportFree$
      .pipe(
        tap(Report.measurePerformance(`${NAMESPACE} adjustPagination`, 1, () => {
          const readingItemsFromPosition = locator.getReadingItemsFromReadingOrderPosition(position)
          const beginReadingItem = readingItemsFromPosition ? readingItemManager.get(readingItemsFromPosition.begin) : undefined
          const endReadingItem = readingItemsFromPosition ? readingItemManager.get(readingItemsFromPosition.end) : undefined
          const beginLastCfi = pagination.getBeginInfo().cfi
          const endLastCfi = pagination.getEndInfo().cfi

          const shouldUpdateBeginCfi =
            pagination.getBeginInfo().readingItemIndex !== readingItemsFromPosition?.begin ||
            beginLastCfi === undefined ||
            beginLastCfi?.startsWith(`epubcfi(/0`)

          const shouldUpdateEndCfi =
            pagination.getEndInfo().readingItemIndex !== readingItemsFromPosition?.end ||
            endLastCfi === undefined ||
            endLastCfi?.startsWith(`epubcfi(/0`)

          if (beginReadingItem && endReadingItem && readingItemsFromPosition) {
            const beginPosition = locator.getReadingItemPositionFromReadingOrderViewPosition(readingItemsFromPosition.beginPosition, beginReadingItem)
            const beginPageIndex = readingItemLocator.getReadingItemPageIndexFromPosition(beginPosition, beginReadingItem)
            const endPosition = locator.getReadingItemPositionFromReadingOrderViewPosition(readingItemsFromPosition.endPosition, endReadingItem)
            const endPageIndex = readingItemLocator.getReadingItemPageIndexFromPosition(endPosition, endReadingItem)

            pagination.updateBeginAndEnd({
              readingItem: beginReadingItem,
              readingItemIndex: readingItemManager.getReadingItemIndex(beginReadingItem) ?? 0,
              pageIndex: readingItemLocator.getReadingItemPageIndexFromPosition(beginPosition, beginReadingItem),
              cfi: shouldUpdateBeginCfi ? cfiLocator.getCfi(beginPageIndex, beginReadingItem) : beginLastCfi,
              options: {
                isAtEndOfChapter: false
              }
            }, {
              readingItem: endReadingItem,
              readingItemIndex: readingItemManager.getReadingItemIndex(endReadingItem) ?? 0,
              pageIndex: readingItemLocator.getReadingItemPageIndexFromPosition(endPosition, endReadingItem),
              cfi: shouldUpdateEndCfi ? cfiLocator.getCfi(endPageIndex, endReadingItem) : endLastCfi,
              options: {
                isAtEndOfChapter: false
              }
            })
          }

          Report.log(NAMESPACE, `adjustPagination$`)
        }, { disable: true }))
      )
  }

  /**
   * Use cases covered by this observer
   * - Layout changed for items
   *  - viewport is free
   *    - we adjust the navigation
   *    - we update the pagination
   *  - viewport is busy (ongoing navigation, animation, etc)
   *    - we wait for viewport free
   *    - we adjust pagination
   *    - we update pagination
   *
   * Once navigation is adjusted we update the pagination regardless if the
   * adjustment was needed or not. This is because the layout may have change. In some case, the content
   * may have changed but by change the viewport position is still the same. It does not mean the actual content
   * is the same.
   *
   * @important
   * Adjustment and pagination update are cancelled as soon as another navigation happens. (it will already be handled there).
   * adjustNavigation$ can trigger a navigation if adjustment is needed which will in term cancel the inner stream.
   *
   * @todo
   * Right now we react to literally every layout and some time we might not need to update pagination (ex pre-paginated element got unload).
   * Maybe we should only listen to current items visible only ?
   */
  const adjustNavigationAfterLayout$ = readingItemManager.$.layout$
    .pipe(
      /**
       * @important
       * Careful with using debounce / throttle here since it can decrease user experience
       * when layout happens it can means an item before the current one has been unloaded, at current code
       * we unload and size back each item to the screen so it will have the effect of flicker for user.
       * Consider this workflow:
       * - user navigate to page 2
       * - viewport move to item 2
       * - page 1 unload and goes back from 2000px to 500px
       * - layout triggered
       * - viewport is now on an item far after item 2 because item 1 shrink (PROBLEM)
       * - sometime after viewport is adjusted back to item 2.
       *
       * Two solution to fix this issue:
       * - maybe later try to implement a different strategy and never shrink back item unless they are loaded
       * - do not use debounce / throttle and navigate back to the item right on the same tick
       */
      // debounceTime(10, animationFrameScheduler),
      switchMap(() =>
        waitForViewportFree$
          .pipe(
            switchMap(() => {
              const focusedReadingItem = readingItemManager.getFocusedReadingItem()

              if (!focusedReadingItem) return EMPTY

              return viewportNavigator.adjustNavigation(focusedReadingItem)
            }),
            takeUntil(viewportNavigator.$.navigation$)
          )
      ),
      share()
    )

  merge(
    adjustNavigationAfterLayout$
      .pipe(
        switchMap(({ adjustedReadingOrderViewPosition }) => {
          return adjustPagination$(adjustedReadingOrderViewPosition)
            .pipe(
              takeUntil(viewportNavigator.$.navigation$)
            )
        })
      ),
    readingItemManager.$.layout$
      .pipe(
        debounceTime(10, animationFrameScheduler),
        tap(() => {
          pagination.updateTotalNumberOfPages(readingItemManager.getAll())
        })
      )
  )
    .pipe(
      takeUntil(context.$.destroy$)
    )
    .subscribe()

  merge(
    readingItemManager.$.focus$
      .pipe(
        tap((event) => {
          // @todo track tail as well (selection, finger etc)

          const readingItem = event.data
          const fingerTracker$ = readingItem.fingerTracker.$
          const selectionTracker$ = readingItem.selectionTracker.$

          selectionSubscription?.unsubscribe()
          selectionSubscription = merge(
            selectionTracker$
              .pipe(
                filter(event => event.event === `selectionchange`),
                tap(event => {
                  subject.next({ type: `onSelectionChange`, data: event.data ? createSelection(event.data, readingItem.item) : null })
                })
              ),
            selectionTracker$
              .pipe(
                filter(({ event }) => event === `selectstart`),
                switchMap(_ => fingerTracker$
                  .pipe(
                    filter(({ event }) => event === `fingermove`),
                    debounce(() => interval(1000)),
                    takeUntil(fingerTracker$
                      .pipe(
                        filter(({ event }) => event === `fingerout`),
                        tap(() => {

                        })
                      )
                    ),
                    tap(({ data }) => {
                      // console.log(data)
                      if (data) {
                        // const fingerPosition = translateFramePositionIntoPage(context, pagination, data, readingItem)
                        // if (fingerPosition.x >= context.getPageSize().width) {
                        //   viewportNavigator.turnRight({ allowReadingItemChange: false })
                        // } else if (fingerPosition.x <= context.getPageSize().width) {
                        //   viewportNavigator.turnLeft({ allowReadingItemChange: false })
                        // }
                      }
                    })
                  )
                )
              )
          )
            .subscribe()
        }),
        catchError(e => {
          Report.error(e)

          return EMPTY
        }),
        takeUntil(context.$.destroy$)
      )
  )
    .subscribe()

  const itemUpdateOnNavigation$ = viewportNavigator.$.navigation$
    .pipe(
      tap((data) => {
        const time = Report.time(`${NAMESPACE} navigation`, 1)
        const currentReadingItem = readingItemManager.getFocusedReadingItem()
        const readingItemsFromPosition = locator.getReadingItemsFromReadingOrderPosition(data.position)
        let beginReadingItem = readingItemsFromPosition ? readingItemManager.get(readingItemsFromPosition.begin) : undefined
        let endReadingItem = readingItemsFromPosition ? readingItemManager.get(readingItemsFromPosition.end) : undefined
        beginReadingItem = beginReadingItem || currentReadingItem
        endReadingItem = endReadingItem || currentReadingItem

        // In theory the item to focus should be either begin or end. This is because the navigation should at least take us on top
        // of it. However this is the theory, due to wrong layout / missing adjustment it could be different.
        // In case of no item to focus is detected we will just fallback to 0
        const readingItemToFocus = data.position.readingItem || beginReadingItem

        if (readingItemToFocus && readingItemToFocus !== currentReadingItem) {
          readingItemManager.focus(readingItemToFocus)
        } else if (!readingItemToFocus) {
          // we default to item 0 so if anything wrong happens during navigation we can fallback to a valid item
          readingItemManager.focus(0)
        }

        if (readingItemToFocus && beginReadingItem && endReadingItem && readingItemsFromPosition) {
          const lastExpectedNavigation = viewportNavigator.getLastUserExpectedNavigation()
          const beginItemIndex = readingItemManager.getReadingItemIndex(beginReadingItem) ?? 0
          const beginPosition = locator.getReadingItemPositionFromReadingOrderViewPosition(readingItemsFromPosition.beginPosition, beginReadingItem)
          const beginPageIndex = readingItemLocator.getReadingItemPageIndexFromPosition(beginPosition, beginReadingItem)
          const endPosition = locator.getReadingItemPositionFromReadingOrderViewPosition(readingItemsFromPosition.endPosition, endReadingItem)
          const endPageIndex = readingItemLocator.getReadingItemPageIndexFromPosition(endPosition, endReadingItem)
          const endItemIndex = readingItemManager.getReadingItemIndex(endReadingItem) ?? 0

          pagination.updateBeginAndEnd({
            readingItem: beginReadingItem,
            readingItemIndex: beginItemIndex,
            pageIndex: beginPageIndex,
            /**
             * Because the start of a navigation may involve animations and interactions we don't resolve heavy CFI here.
             * We do want to have certain information correct in the pagination right after a navigation (same tick) but we just
             * defer heavy non vital stuff for later.
             * There are only 4 different cfi update at this stage:
             * - navigation comes from cfi, we simply affect the cfi to the pagination
             * - navigation comes from adjustment with controlled mode, we don't update the cfi, just pass the previous one
             * - navigation comes from adjustment with free mode, we will update with root cfi if needed because we could be on new page
             * - navigation is not from adjustment, this means we are on either new page or new reading item, we use light cfi with root (no dom lookup)
             *
             * The cfi is later adjusted with heavy dom lookup once the viewport is free.
             */
            cfi: lastExpectedNavigation?.type === `navigate-from-cfi` && readingItemToFocus === beginReadingItem
              ? lastExpectedNavigation.data
              : data.triggeredBy === `adjust` && context.getSettings().computedPageTurnMode === `controlled`
                ? pagination.getBeginInfo().cfi
                : beginItemIndex !== pagination.getBeginInfo().readingItemIndex
                  ? cfiLocator.getRootCfi(beginReadingItem)
                  : undefined,
            options: {
              isAtEndOfChapter: false
            }
          }, {
            readingItem: endReadingItem,
            readingItemIndex: endItemIndex,
            pageIndex: endPageIndex,
            cfi: lastExpectedNavigation?.type === `navigate-from-cfi` && readingItemToFocus === endReadingItem
              ? lastExpectedNavigation.data
              : data.triggeredBy === `adjust` && context.getSettings().computedPageTurnMode === `controlled`
                ? pagination.getEndInfo().cfi
                : endItemIndex !== pagination.getEndInfo().readingItemIndex
                  ? cfiLocator.getRootCfi(endReadingItem)
                  : undefined,
            options: {
              isAtEndOfChapter: false
            }
          })

          Report.log(NAMESPACE, `itemUpdateOnNavigation$`, { readingItemHasChanged: readingItemToFocus !== currentReadingItem, item: readingItemToFocus, readingItemToFocus, index: readingItemManager.getReadingItemIndex(readingItemToFocus), offset: data, endReadingItem, beginReadingItem, lastExpectedNavigation, readingItemsFromPosition })
        }

        time()
      }),
      share(),
      takeUntil(context.$.destroy$)
    )

  /**
   * Adjust heavier pagination once the navigation and items are updated.
   * This is also cancelled if the layout changes, because the layout will
   * trigger a new navigation adjustment and pagination again.
   */
  itemUpdateOnNavigation$
    .pipe(
      switchMap((data) => {
        return adjustPagination$(data.position)
          .pipe(
            takeUntil(readingItemManager.$.layout$)
          )
      }),
      takeUntil(context.$.destroy$)
    )
    .subscribe()

  /**
   * Loading and unloading content has two important issues that need to be considered
   * - For reflow book it will un-sync the viewport
   * - Loading / unload is CPU intensive.
   *
   * Because of theses two reason we only load/unload when the adjustment is done. This ensure a smooth transition for the second point.
   * For the first point it avoid having content being un-sync while the transition is happening. That way we avoid a new chapter
   * to suddenly being displayed under the transition. The first issue is only a problem for reflow book as paginated will not
   * un-sync the viewport.
   * The flow for the first point is as follow:
   * [navigate] -> [transition] -> [new position] -> [iframe unload/load] -> (eventual adjustment).
   *
   * It would ne nice to be able to load/unload without having to worry about viewport mis-adjustment but due to the current iframe and viewport
   * layout method we have to take it into consideration.
   */
  merge(
    /**
     * We want to update content after navigation since we are at a different place.
     * We also wait for navigated items to be updated so that we have access to correct focus.
     * which is why we use this observer rather than `navigation$`.
     */
    itemUpdateOnNavigation$,
    /**
     * This one make sure we also listen for layout change and that we execute the code once the navigation
     * has been adjusted (whether it's needed or not).
     */
    adjustNavigationAfterLayout$
  )
    .pipe(
      switchMap(() => {
        return waitForViewportFree$
          .pipe(
            map(() => {
              const focusedReadingItemIndex = readingItemManager.getFocusedReadingItemIndex()

              Report.log(NAMESPACE, `update contents`, { focusedReadingItemIndex })

              if (focusedReadingItemIndex === undefined) return

              const { begin = focusedReadingItemIndex, end = focusedReadingItemIndex } = locator.getReadingItemsFromReadingOrderPosition(viewportNavigator.getCurrentNavigationPosition()) || {}

              if (begin !== focusedReadingItemIndex && end !== focusedReadingItemIndex) {
                Report.warn(`Current viewport is not in sync with focus item, load from focus item rather than viewport`)
                readingItemManager.loadContents([focusedReadingItemIndex, focusedReadingItemIndex])
              } else {
                readingItemManager.loadContents([begin, end])
              }
            }),
            take(1)
          )
      }),
      takeUntil(context.$.destroy$)
    ).subscribe()

  return {
    viewportNavigator,
    element: containerElement,
    locator,
    readingItemLocator,
    cfiLocator,
    normalizeEventForViewport: eventsHelper.normalizeEventForViewport,
    manipulateReadingItems,
    load,
    layout: () => layoutSubject$.next(),
    destroy: () => {
      viewportNavigator.destroy()
      readingItemManager.destroy()
      selectionSubscription?.unsubscribe()
      containerElement.remove()
    },
    isSelecting: () => readingItemManager.getFocusedReadingItem()?.selectionTracker.isSelecting(),
    getSelection: () => readingItemManager.getFocusedReadingItem()?.selectionTracker.getSelection(),
    $: {
      $: subject.asObservable(),
      viewportState$: viewportNavigator.$.state$,
      layout$: readingItemManager.$.layout$
    }
  }
}

const createContainerElement = (doc: Document, hooks$: BehaviorSubject<Hook[]>) => {
  const element: HTMLElement = doc.createElement(`div`)
  element.id = `ReadingOrderView`
  element.className = `ReadingOrderView`
  element.style.cssText = `
    height: 100%;
    position: relative;
  `
  /**
   * Beware of this property, do not try to change anything else or remove it.
   * This is early forced optimization and is used for this specific context.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/will-change
   *
   * @important
   * This seems to be responsible for the screen freeze issue
   */
  // element.style.willChange = `transform`
  element.style.transformOrigin = `0 0`

  return hooks$.getValue().reduce((element, hook) => {
    if (hook.name === `readingOrderView.onBeforeContainerCreated`) {
      return hook.fn(element)
    }

    return element
  }, element)
}

export type ReadingOrderView = ReturnType<typeof createReadingOrderView>
