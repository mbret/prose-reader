import { animationFrameScheduler, EMPTY, interval, merge, of, Subject, Subscription } from "rxjs"
import { catchError, debounce, debounceTime, delay, distinctUntilChanged, filter, map, skip, switchMap, take, takeUntil, tap } from "rxjs/operators"
import { Report } from "../report"
import { Context } from "../context"
import { buildChapterInfoFromReadingItem } from "../navigation"
import { createViewportNavigator } from "./viewportNavigator/viewportNavigator"
import { Pagination } from "../pagination"
import { createReadingItem } from "../readingItem"
import { createLocator as createReadingItemLocator } from "../readingItem/locator"
import { createReadingItemManager } from "../readingItemManager"
import { createLocator } from "./locator"
import { createCfiLocator } from "./cfiLocator"
import { createEventsHelper } from "./eventsHelper"
import { createSelection } from "../selection"
import { ViewportNavigationEntry } from "./navigator"
import { isShallowEqual } from "../utils/objects"

const NAMESPACE = 'readingOrderView'

export type ReadingOrderView = ReturnType<typeof createReadingOrderView>

type ReadingItem = ReturnType<typeof createReadingItem>
type ReadingItemHook = Parameters<ReadingItem['registerHook']>[0]
type RequireLayout = boolean
type ManipulableReadingItemCallback = Parameters<ReadingItem['manipulateReadingItem']>[0]
type ManipulableReadingItemCallbackPayload = Parameters<ManipulableReadingItemCallback>[0]

type Hook =
  | {
    name: `readingItem.onLoad`,
    fn: Extract<ReadingItemHook, { name: 'onLoad' }>['fn']
  }
  | {
    name: `readingItem.onCreated`,
    fn: (payload: { container: HTMLElement, loadingElement: HTMLElement }) => void
  }
  | {
    name: `readingItem.onGetResource`,
    fn: Extract<ReadingItemHook, { name: 'onGetResource' }>['fn']
  }

type Event =
  { type: `layoutUpdate` }
  | { type: `onSelectionChange`, data: ReturnType<typeof createSelection> | null }

export const createReadingOrderView = ({ containerElement, context, pagination, iframeEventBridgeElement }: {
  containerElement: HTMLElement,
  iframeEventBridgeElement: HTMLElement,
  context: Context,
  pagination: Pagination,
}) => {
  const subject = new Subject<Event>()
  const doc = containerElement.ownerDocument
  const readingItemManager = createReadingItemManager({ context })
  const element = createElement(doc)
  containerElement.appendChild(element)
  const readingItemLocator = createReadingItemLocator({ context })
  const locator = createLocator({ context, readingItemManager, readingItemLocator })
  const cfiLocator = createCfiLocator({ readingItemManager, context, readingItemLocator })
  const viewportNavigator = createViewportNavigator({ context, pagination, readingItemManager, element, cfiLocator, locator })
  const eventsHelper = createEventsHelper({ context, readingItemManager, iframeEventBridgeElement, locator })
  let selectionSubscription: Subscription | undefined
  let hooks: Hook[] = []

  const layout = () => {
    if (context.getComputedPageTurnMode() === `free`) {
      element.style.overflow = `scroll`
    } else {
      element.style.removeProperty(`overflow`)
    }

    viewportNavigator.layout()
    readingItemManager.layout()
  }

  const load = () => {
    context.getManifest()?.readingOrder.map(async (resource) => {
      const readingItem = createReadingItem({
        item: resource,
        containerElement: element,
        iframeEventBridgeElement,
        context,
      })
      hooks.forEach((hook) => {
        if (hook.name === `readingItem.onLoad`) {
          readingItem.registerHook({ name: `onLoad`, fn: hook.fn })
        }
        if (hook.name === `readingItem.onGetResource`) {
          readingItem.registerHook({ name: `onGetResource`, fn: hook.fn })
        }
      })
      readingItemManager.add(readingItem)
    })
    hooks.forEach(hook => {
      if (hook.name === `readingItem.onCreated`) {
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

  const registerHook = (hook: Hook) => {
    hooks.push(hook)

    readingItemManager.getAll().forEach((item) => {
      if (hook.name === `readingItem.onLoad`) {
        item.registerHook({ name: `onLoad`, fn: hook.fn })
      }
      if (hook.name === `readingItem.onGetResource`) {
        item.registerHook({ name: `onGetResource`, fn: hook.fn })
      }
    })
  }

  /**
   * Watch for settings update that require changes
   * on this layer.
   */
  context.$.settings$
    .pipe(
      map(settings => ({
        pageTurnDirection: settings.pageTurnDirection,
        pageTurnMode: context.getComputedPageTurnMode()
      })),
      distinctUntilChanged(isShallowEqual),
      skip(1),
      tap(layout),
      takeUntil(context.$.destroy$)
    )
    .subscribe()

  const waitForViewportFree$ = viewportNavigator.$.state$.pipe(filter(v => v === `free`), take(1))

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
            pagination.getBeginInfo().readingItemIndex !== readingItemsFromPosition?.begin
            || beginLastCfi === undefined
            || beginLastCfi?.startsWith(`epubcfi(/0`)

          const shouldUpdateEndCfi =
            pagination.getEndInfo().readingItemIndex !== readingItemsFromPosition?.end
            || endLastCfi === undefined
            || endLastCfi?.startsWith(`epubcfi(/0`)

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
        }, { disable: true }))
      )
  }

  readingItemManager.$.layout$
    .pipe(
      tap(() => {
        subject.next({ type: `layoutUpdate` })
      }),
      takeUntil(context.$.destroy$)
    )
    .subscribe()

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
  readingItemManager.$.layout$
    .pipe(
      debounceTime(10, animationFrameScheduler),
      tap(() => {
        pagination.updateTotalNumberOfPages(readingItemManager.getAll())
      }),
      switchMap(() =>
        waitForViewportFree$
          .pipe(
            switchMap(() => {
              const focusedReadingItem = readingItemManager.getFocusedReadingItem()

              if (!focusedReadingItem) return EMPTY

              const adjustNavigation$ = context.getComputedPageTurnMode() === `controlled`
                ? viewportNavigator.adjustNavigation(focusedReadingItem, {})
                : of({ adjustedReadingOrderViewPosition: viewportNavigator.getCurrentNavigationPosition() })

              return adjustNavigation$
                .pipe(
                  switchMap(({ adjustedReadingOrderViewPosition }) => {
                    return adjustPagination$(adjustedReadingOrderViewPosition)
                  })
                )
            }),
            takeUntil(viewportNavigator.$.navigation$)
          )
      ),
      takeUntil(context.$.destroy$)
    )
    .subscribe()

  merge(
    readingItemManager.$.focus$,
    readingItemManager.$.layout$
  )
    .pipe(
      // we use a timeout because we don't want to trigger new reflow while a current one happens
      // due to focus being changed. loadContents itself is not always async.
      // we can also have fast repeated focus or layout
      debounceTime(10, animationFrameScheduler),
      switchMap(() => {
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
        return waitForViewportFree$
          .pipe(
            map(() => {
              const focusedReadingItemIndex = readingItemManager.getFocusedReadingItemIndex()

              if (focusedReadingItemIndex === undefined) return

              const { begin = focusedReadingItemIndex, end = focusedReadingItemIndex } = locator.getReadingItemsFromReadingOrderPosition(viewportNavigator.getCurrentNavigationPosition()) || {}

              if (begin !== focusedReadingItemIndex && end !== focusedReadingItemIndex) {
                console.warn(`Current viewport is not in sync with focus item, load from focus item rather than viewport`)
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
                filter(event => event.event === 'selectionchange'),
                tap(event => {
                  subject.next({ type: `onSelectionChange`, data: event.data ? createSelection(event.data, readingItem.item) : null })
                })
              ),
            selectionTracker$
              .pipe(
                filter(({ event }) => event === 'selectstart'),
                switchMap(_ => fingerTracker$
                  .pipe(
                    filter(({ event }) => event === 'fingermove'),
                    debounce(() => interval(1000)),
                    takeUntil(fingerTracker$
                      .pipe(
                        filter(({ event }) => event === 'fingerout'),
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
      ),
  )
    .subscribe()

  viewportNavigator.$.navigation$
    .pipe(
      switchMap((data) => {
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
             * There are only three different cfi update at this stage:
             * - navigation comes from cfi, we simply affect the cfi to the pagination
             * - navigation comes from adjustment, we don't update the cfi, just pass the previous one
             * - navigation is not from adjustment, this means we are on either new page or new reading item, we use light cfi with root (no dom lookup)
             * 
             * The cfi is later adjusted with heavy dom lookup once the viewport is free.
             */
            cfi: lastExpectedNavigation?.type === 'navigate-from-cfi' && readingItemToFocus === beginReadingItem
              ? lastExpectedNavigation.data
              : data.triggeredBy === `adjust`
                ? pagination.getBeginInfo().cfi
                : beginItemIndex !== pagination.getBeginInfo().readingItemIndex
                  ? cfiLocator.getRootCfi(beginReadingItem)
                  : undefined,
            options: {
              isAtEndOfChapter: false,
            }
          }, {
            readingItem: endReadingItem,
            readingItemIndex: endItemIndex,
            pageIndex: endPageIndex,
            cfi: lastExpectedNavigation?.type === 'navigate-from-cfi' && readingItemToFocus === endReadingItem
              ? lastExpectedNavigation.data
              : data.triggeredBy === `adjust`
                ? pagination.getEndInfo().cfi
                : endItemIndex !== pagination.getEndInfo().readingItemIndex
                  ? cfiLocator.getRootCfi(endReadingItem)
                  : undefined,
            options: {
              isAtEndOfChapter: false,
            }
          })

          Report.log(NAMESPACE, `navigation$`, { readingItemHasChanged: readingItemToFocus !== currentReadingItem, item: readingItemToFocus, readingItemToFocus, index: readingItemManager.getReadingItemIndex(readingItemToFocus), offset: data, endReadingItem, beginReadingItem, lastExpectedNavigation, readingItemsFromPosition })
        }

        time()

        return adjustPagination$(data.position)
          .pipe(
            takeUntil(readingItemManager.$.layout$)
          )
      }),
      takeUntil(context.$.destroy$)
    )
    .subscribe()

  return {
    viewportNavigator,
    element,
    locator,
    readingItemLocator,
    cfiLocator,
    getFocusedReadingItemIndex: () => readingItemManager.getFocusedReadingItemIndex(),
    getReadingItem: readingItemManager.get,
    registerHook,
    normalizeEventForViewport: eventsHelper.normalizeEventForViewport,
    manipulateReadingItems,
    getCurrentNavigationPosition: viewportNavigator.getCurrentNavigationPosition,
    goToNextSpineItem: () => {
      const currentSpineIndex = readingItemManager.getFocusedReadingItemIndex() || 0
      const numberOfSpineItems = context?.getManifest()?.readingOrder.length || 1
      if (currentSpineIndex < (numberOfSpineItems - 1)) {
        viewportNavigator.goToSpineItem(currentSpineIndex + 1)
      }
    },
    goToPreviousSpineItem: () => {
      const currentSpineIndex = readingItemManager.getFocusedReadingItemIndex() || 0
      if (currentSpineIndex > 0) {
        viewportNavigator.goToSpineItem(currentSpineIndex - 1)
      }
    },
    load,
    layout,
    getChapterInfo() {
      const item = readingItemManager.getFocusedReadingItem()
      const manifest = context.getManifest()
      return item && manifest && buildChapterInfoFromReadingItem(manifest, item)
    },
    destroy: () => {
      viewportNavigator.destroy()
      readingItemManager.destroy()
      selectionSubscription?.unsubscribe()
      element.remove()
      hooks = []
    },
    isSelecting: () => readingItemManager.getFocusedReadingItem()?.selectionTracker.isSelecting(),
    getSelection: () => readingItemManager.getFocusedReadingItem()?.selectionTracker.getSelection(),
    $: {
      $: subject.asObservable(),
      viewportState$: viewportNavigator.$.state$,
    },
  }
}

const createElement = (doc: Document) => {
  const element = doc.createElement('div')
  element.id = 'ReadingOrderView'
  element.className = 'ReadingOrderView'
  element.style.height = `100%`
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

  return element
}