import { EMPTY, interval, merge, Subject, Subscription, timer } from "rxjs"
import { catchError, debounce, filter, switchMap, takeUntil, tap } from "rxjs/operators"
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
  | { type: `onNavigationChange` }

export const createReadingOrderView = ({ containerElement, context, pagination, iframeEventBridgeElement }: {
  containerElement: HTMLElement,
  iframeEventBridgeElement: HTMLElement,
  context: Context,
  pagination: Pagination,
}) => {
  const subject = new Subject<Event>()
  const doc = containerElement.ownerDocument
  const readingItemManager = createReadingItemManager({ context })
  const cfiHelper = createCfiHelper({ readingItemManager, context })
  const element = createElement(doc)
  containerElement.appendChild(element)
  const viewportNavigator = createViewportNavigator({ context, pagination, readingItemManager, element })
  const locator = createLocator({ context, readingItemManager })
  const eventsHelper = createEventsHelper({ context, readingItemManager, iframeEventBridgeElement })
  let selectionSubscription: Subscription | undefined
  let focusedReadingItemSubscription: Subscription | undefined
  let hooks: Hook[] = []

  const layout = () => {
    readingItemManager.layout()
  }

  const load = () => {
    context.getManifest()?.readingOrder.map(async (resource, index) => {
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

    readingItemManager.getAll().forEach((item, index) => {
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

  const readingItemManagerSubscription = merge(
    readingItemManager.$
      .pipe(
        filter(event => event.event === `focus` || event.event === `layout`),
        // we use a timeout because we don't want to trigger new reflow while a current one happens
        // due to focus being changed. loadContents itself is not always async.
        switchMap(() => timer(1).pipe(
          tap(() => {
            const focusedReadingItemIndex = readingItemManager.getFocusedReadingItemIndex()

            if (focusedReadingItemIndex === undefined) return

            const { begin = focusedReadingItemIndex, end = focusedReadingItemIndex } = locator.getReadingItemsFromReadingOrderPosition(viewportNavigator.getCurrentPosition()) || {}

            if (begin !== focusedReadingItemIndex && end !== focusedReadingItemIndex) {
              console.warn(`detected viewport items are not valid, waiting for adjustment`)
              readingItemManager.loadContents([focusedReadingItemIndex, focusedReadingItemIndex])
            } else {
              readingItemManager.loadContents([begin, end])
            }
          })
        )),
      ),
    readingItemManager.$
      .pipe(
        tap((event) => {
          if (event.event === 'layout') {
            subject.next({ type: `layoutUpdate` })

            pagination.updateTotalNumberOfPages(readingItemManager.getAll())

            const focusedReadingItem = readingItemManager.getFocusedReadingItem()

            if (focusedReadingItem) {
              viewportNavigator.adjustReadingOffsetPosition(focusedReadingItem, { shouldAdjustCfi: false })
            }
          }

          // @todo track tail as well (selection, finger etc)

          if (event.event === `focus`) {
            const readingItem = event.data
            const fingerTracker$ = readingItem.fingerTracker.$
            const selectionTracker$ = readingItem.selectionTracker.$

            if (readingItem.isFrameReady()) {
              // @todo maybe we need to adjust cfi here ? it should be fine since if it's already
              // ready then the navigation should have caught the right cfi, if not the observable
              // will catch it
            }

            focusedReadingItemSubscription?.unsubscribe()
            focusedReadingItemSubscription = readingItem.$.pipe(
              tap(event => {
                // @todo merge this behavior with global readingItemManager layout
                if (event.event === 'contentLayoutChange' && event.data.isFirstLayout && event.data.isReady) {
                  viewportNavigator.adjustReadingOffsetPosition(readingItem, { shouldAdjustCfi: true })
                }
              }),
              catchError(e => {
                Report.error(e)

                return EMPTY
              }),
            ).subscribe()

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
                        console.log(data)
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
          }
        }),
        catchError(e => {
          Report.error(e)

          return EMPTY
        }),
      )
  ).subscribe()

  const navigatorSubscription = viewportNavigator.$
    .pipe(
      tap((data) => {
        if (data.event === 'navigation') {
          const currentReadingItem = readingItemManager.getFocusedReadingItem()
          const readingItemsFromPosition = locator.getReadingItemsFromReadingOrderPosition(data.data)
          const beginReadingItem = readingItemsFromPosition ? readingItemManager.get(readingItemsFromPosition.begin) : undefined
          const endReadingItem = readingItemsFromPosition ? readingItemManager.get(readingItemsFromPosition.end) : undefined
          // In theory the item to focus should be either begin or end. This is because the navigation should at least take us on top
          // of it. However this is the theory, due to wrong layout / missing adjustment it could be different.
          const readingItemToFocus = data.data.readingItem || beginReadingItem

          if (readingItemToFocus && beginReadingItem && endReadingItem && readingItemsFromPosition) {
            if (readingItemToFocus !== currentReadingItem) {
              readingItemManager.focus(readingItemToFocus)
            }

            const lastExpectedNavigation = viewportNavigator.getLastUserExpectedNavigation()

            const preparedInfo = preparePaginationUpdateInfo(beginReadingItem, endReadingItem, readingItemsFromPosition.beginPosition, readingItemsFromPosition.endPosition)

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

            Report.log(NAMESPACE, `navigateTo`, `navigate success`, { readingItemHasChanged: readingItemToFocus !== currentReadingItem, readingItemToFocus, offset: data, endReadingItem, beginReadingItem, lastExpectedNavigation })
          }

          subject.next({ type: `onNavigationChange` })
        }

        if (data.event === 'adjust') {
          const readingItemsFromPosition = locator.getReadingItemsFromReadingOrderPosition(data.data)
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

          subject.next({ type: `onNavigationChange` })
        }
      })
    )
    .subscribe()

  return {
    ...viewportNavigator,
    element,
    locator,
    getCfiMetaInformation: cfiHelper.getCfiMetaInformation,
    resolveCfi: cfiHelper.resolveCfi,
    getFocusedReadingItemIndex: () => readingItemManager.getFocusedReadingItemIndex(),
    getReadingItem: readingItemManager.get,
    registerHook,
    normalizeEvent: eventsHelper.normalizeEvent,
    manipulateReadingItems,
    getCurrentPosition: viewportNavigator.getCurrentPosition,
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
      readingItemManager.destroy()
      readingItemManagerSubscription?.unsubscribe()
      selectionSubscription?.unsubscribe()
      focusedReadingItemSubscription?.unsubscribe()
      navigatorSubscription.unsubscribe()
      element.remove()
      hooks = []
    },
    isSelecting: () => readingItemManager.getFocusedReadingItem()?.selectionTracker.isSelecting(),
    getSelection: () => readingItemManager.getFocusedReadingItem()?.selectionTracker.getSelection(),
    $: subject,
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