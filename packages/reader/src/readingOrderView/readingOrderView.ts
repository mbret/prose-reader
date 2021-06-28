import { EMPTY, interval, merge, of, Subject, Subscription, timer } from "rxjs"
import { catchError, debounce, debounceTime, delay, filter, map, switchMap, take, takeUntil, tap } from "rxjs/operators"
import { Report } from "../report"
import { Context } from "../context"
import { buildChapterInfoFromReadingItem } from "../navigation"
import { createViewportNavigator } from "./viewportNavigator"
import { Pagination } from "../pagination"
import { createReadingItem } from "../readingItem"
import { createReadingItemManager } from "../readingItemManager"
import { createLocator } from "./locator"
import { createCfiHelper } from "./cfiHelper"
import { createEventsHelper } from "./eventsHelper"
import { createSelection } from "../selection"
import { PAGINATION_UPDATE_AFTER_VIEWPORT_ADJUSTMENT_DEBOUNCE } from "../constants"

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
  const destroy$ = new Subject<void>()
  const doc = containerElement.ownerDocument
  const readingItemManager = createReadingItemManager({ context })
  const cfiHelper = createCfiHelper({ readingItemManager, context })
  const element = createElement(doc)
  containerElement.appendChild(element)
  const viewportNavigator = createViewportNavigator({ context, pagination, readingItemManager, element })
  const locator = createLocator({ context, readingItemManager })
  const eventsHelper = createEventsHelper({ context, readingItemManager, iframeEventBridgeElement })
  let selectionSubscription: Subscription | undefined
  let hooks: Hook[] = []

  const layout = () => {
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

  function registerHook(hook: Hook) {
    hooks.push(hook)

    readingItemManager.getAll().forEach((item) => {
      if (hook.name === `readingItem.onLoad`) {
        item.registerHook({ name: `onLoad`, fn: hook.fn })
      }
    })
  }

  const preparePaginationUpdateInfo = (beginReadingItem: ReadingItem, endReadingItem: ReadingItem, beginPosition: { x: number, y: number }, endPosition: { x: number, y: number }) => {
    return {
      begin: {
        readingItem: beginReadingItem,
        readingItemIndex: readingItemManager.getReadingItemIndex(beginReadingItem) ?? 0,
        readingItemPosition: locator.getReadingItemRelativePositionFromReadingOrderViewPosition(beginPosition, beginReadingItem),
      },
      end: {
        readingItem: endReadingItem,
        readingItemIndex: readingItemManager.getReadingItemIndex(endReadingItem) ?? 0,
        readingItemPosition: locator.getReadingItemRelativePositionFromReadingOrderViewPosition(endPosition, endReadingItem),
      }
    }
  }

  readingItemManager.$.layout$
    .pipe(
      tap(() => {
        subject.next({ type: `layoutUpdate` })
        pagination.updateTotalNumberOfPages(readingItemManager.getAll())
      }),
      switchMap(() => {
        const wait$ = viewportNavigator.$.state$.pipe(filter(d => d === `free`), take(1))

        return wait$
          .pipe(
            tap(() => {
              const focusedReadingItem = readingItemManager.getFocusedReadingItem()
              if (focusedReadingItem) {

                // console.warn(`layoutUpdate adjust`, readingItemManager.getReadingItemIndex(focusedReadingItem))

                viewportNavigator.adjustReadingOffsetPosition(focusedReadingItem, {})
              }
            })
          )
      }),
      takeUntil(destroy$)
    ).subscribe()

  merge(readingItemManager.$.focus$, readingItemManager.$.layout$)
    .pipe(
      // we use a timeout because we don't want to trigger new reflow while a current one happens
      // due to focus being changed. loadContents itself is not always async.
      delay(1),
      switchMap(() => merge(
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
        viewportNavigator.$.adjust$
          .pipe(
            filter(value => value === `end`),
            map(() => {
              const focusedReadingItemIndex = readingItemManager.getFocusedReadingItemIndex()

              if (focusedReadingItemIndex === undefined) return

              const { begin = focusedReadingItemIndex, end = focusedReadingItemIndex } = locator.getReadingItemsFromReadingOrderPosition(viewportNavigator.getCurrentNavigationPosition()) || {}

              if (begin !== focusedReadingItemIndex && end !== focusedReadingItemIndex) {
                console.warn(`Current viewport is not in sync with focus item, load from focus item rather than viewport`)
                readingItemManager.unloadContents([focusedReadingItemIndex, focusedReadingItemIndex])
                readingItemManager.loadContents([focusedReadingItemIndex, focusedReadingItemIndex])
              } else {
                readingItemManager.unloadContents([begin, end])
                readingItemManager.loadContents([begin, end])
              }
            }),
            take(1)
          ),
      )),
      takeUntil(destroy$)
    ).subscribe()

  const readingItemManager$ = merge(
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
      )
  )

  const navigation$ = viewportNavigator.$.$
    .pipe(
      tap((data) => {
        if (data.type === 'navigation') {
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

          // console.warn({ beginReadingItem, endReadingItem, readingItemsFromPosition, currentReadingItem, readingItemToFocus, data })

          if (readingItemToFocus && beginReadingItem && endReadingItem && readingItemsFromPosition) {
            const lastExpectedNavigation = viewportNavigator.getLastUserExpectedNavigation()

            const preparedInfo = preparePaginationUpdateInfo(beginReadingItem, endReadingItem, readingItemsFromPosition.beginPosition, readingItemsFromPosition.endPosition)

            // console.warn(preparedInfo, data.position)

            pagination.updateBeginAndEnd({
              ...preparedInfo.begin,
              options: {
                isAtEndOfChapter: false,
                cfi: lastExpectedNavigation?.type === 'navigate-from-cfi' && readingItemToFocus === beginReadingItem
                  ? lastExpectedNavigation.data
                  : undefined
              }
            }, {
              ...preparedInfo.end,
              options: {
                isAtEndOfChapter: false,
                cfi: lastExpectedNavigation?.type === 'navigate-from-cfi' && readingItemToFocus === endReadingItem
                  ? lastExpectedNavigation.data
                  : undefined
              }
            })

            Report.log(NAMESPACE, `navigation$`, { readingItemHasChanged: readingItemToFocus !== currentReadingItem, item: readingItemToFocus, index: readingItemManager.getReadingItemIndex(readingItemToFocus), offset: data, endReadingItem, beginReadingItem, lastExpectedNavigation, readingItemsFromPosition })
          }
        }
      })
    )

  const viewportAdjust$ = viewportNavigator.$.$
    .pipe(
      filter(data => data.type === 'adjustEnd'),
      debounceTime(PAGINATION_UPDATE_AFTER_VIEWPORT_ADJUSTMENT_DEBOUNCE, undefined),
      tap(() => {
        // console.warn(`adjustEnd`, viewportNavigator.getCurrentNavigationPosition())
        const currentPosition = viewportNavigator.getCurrentNavigationPosition()
        // const currentPosition = data.position
        const readingItemsFromPosition = locator.getReadingItemsFromReadingOrderPosition(currentPosition)
        const beginReadingItem = readingItemsFromPosition ? readingItemManager.get(readingItemsFromPosition.begin) : undefined
        const endReadingItem = readingItemsFromPosition ? readingItemManager.get(readingItemsFromPosition.end) : undefined
        const beginLastCfi = pagination.getBeginInfo().cfi
        const endLastCfi = pagination.getEndInfo().cfi

        // @todo if focused is not on either do not do anything

        // because we adjusted the position, the offset may have changed and with it current page, etc
        // because this is an adjustment we do not want to update the cfi (anchor)
        // unless it has not been set yet or it is a basic /0 node
        const shouldUpdateBeginCfi =
          pagination.getBeginInfo().readingItemIndex !== readingItemsFromPosition?.begin
          || beginLastCfi === undefined
          || beginLastCfi?.startsWith(`epubcfi(/0`)

        const shouldUpdateEndCfi =
          pagination.getEndInfo().readingItemIndex !== readingItemsFromPosition?.end
          || endLastCfi === undefined
          || endLastCfi?.startsWith(`epubcfi(/0`)

        if (beginReadingItem && endReadingItem && readingItemsFromPosition) {
          const preparedInfo = preparePaginationUpdateInfo(beginReadingItem, endReadingItem, readingItemsFromPosition.beginPosition, readingItemsFromPosition.endPosition)

          pagination.updateBeginAndEnd({
            ...preparedInfo.begin,
            options: {
              cfi: shouldUpdateBeginCfi ? undefined : beginLastCfi,
              isAtEndOfChapter: false
            }
          }, {
            ...preparedInfo.end,
            options: {
              cfi: shouldUpdateEndCfi ? undefined : endLastCfi,
              isAtEndOfChapter: false
            }
          })
        }
      })
    )

  merge(readingItemManager$, navigation$, viewportAdjust$)
    .pipe(
      takeUntil(destroy$)
    )
    .subscribe()

  return {
    viewportNavigator,
    element,
    locator,
    getCfiMetaInformation: cfiHelper.getCfiMetaInformation,
    resolveCfi: cfiHelper.resolveCfi,
    getFocusedReadingItemIndex: () => readingItemManager.getFocusedReadingItemIndex(),
    getReadingItem: readingItemManager.get,
    registerHook,
    normalizeEvent: eventsHelper.normalizeEvent,
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
      destroy$.next()
      destroy$.complete()
      viewportNavigator.destroy()
      readingItemManager.destroy()
      selectionSubscription?.unsubscribe()
      // focusedReadingItemSubscription?.unsubscribe()
      element.remove()
      hooks = []
    },
    isSelecting: () => readingItemManager.getFocusedReadingItem()?.selectionTracker.isSelecting(),
    getSelection: () => readingItemManager.getFocusedReadingItem()?.selectionTracker.getSelection(),
    $: subject.asObservable(),
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