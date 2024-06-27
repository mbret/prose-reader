import { BehaviorSubject, EMPTY, interval, merge, Observable, Subject, Subscription } from "rxjs"
import {
  catchError,
  debounce,
  filter,
  map,
  share,
  switchMap,
  take,
  takeUntil,
  tap,
  withLatestFrom,
} from "rxjs/operators"
import { Report } from "../report"
import { Context } from "../context/Context"
import { Pagination } from "../pagination/pagination"
import { createSpineItem } from "../spineItem/createSpineItem"
import { SpineItemManager } from "../spineItemManager"
import { createLocationResolver as createSpineLocationResolver } from "./locationResolver"
import { createLocationResolver as createSpineItemLocationResolver } from "../spineItem/locationResolver"
import { createCfiLocator } from "./cfiLocator"
import { createSelection } from "../selection"
import { ViewportNavigationEntry } from "./navigationResolver"
import type { Spine } from "../types/Spine"
import { HTML_PREFIX } from "../constants"
import { AdjustedNavigation, Navigation } from "../viewportNavigator/types"
import { Manifest } from ".."
import { SettingsManager } from "../settings/SettingsManager"
import { HookManager } from "../hooks/HookManager"

const report = Report.namespace(`spine`)
const noopElement = document.createElement("div")

type SpineItem = ReturnType<typeof createSpineItem>
type RequireLayout = boolean
type ManipulableSpineItemCallback = Parameters<SpineItem[`manipulateSpineItem`]>[0]
type ManipulableSpineItemCallbackPayload = Parameters<ManipulableSpineItemCallback>[0]

type Event = {
  type: `onSelectionChange`
  data: ReturnType<typeof createSelection> | null
}

export const createSpine = ({
  element$,
  context,
  pagination,
  spineItemManager,
  spineItemLocator,
  spineLocator,
  cfiLocator,
  navigation$,
  navigationAdjusted$,
  currentNavigationPosition$,
  viewportState$,
  settings,
  hookManager,
}: {
  element$: Observable<HTMLElement>
  context: Context
  pagination: Pagination
  spineItemManager: SpineItemManager
  spineItemLocator: ReturnType<typeof createSpineItemLocationResolver>
  spineLocator: ReturnType<typeof createSpineLocationResolver>
  cfiLocator: ReturnType<typeof createCfiLocator>
  navigation$: Observable<Navigation>
  navigationAdjusted$: Observable<AdjustedNavigation>
  currentNavigationPosition$: Observable<{
    x: number
    y: number
  }>
  viewportState$: Observable<`free` | `busy`>
  settings: SettingsManager
  hookManager: HookManager
}): Spine => {
  const spineItems$ = new Subject<SpineItem[]>()
  const itemsBeforeDestroySubject$ = new Subject<void>()
  const subject = new Subject<Event>()
  const containerElement$ = new BehaviorSubject<HTMLElement>(noopElement)
  let selectionSubscription: Subscription | undefined

  /**
   * @todo handle reload
   */
  const reload = (manifest: Manifest) => {
    itemsBeforeDestroySubject$.next()

    spineItemManager.destroyItems()

    manifest.spineItems.map((resource) => {
      const spineItem = createSpineItem({
        item: resource,
        containerElement: containerElement$.getValue(),
        context,
        viewportState$,
        settings,
        hookManager,
      })
      spineItemManager.add(spineItem)
    })

    spineItems$.next(spineItemManager.getAll())
  }

  const manipulateSpineItems = (
    cb: (payload: ManipulableSpineItemCallbackPayload & { index: number }) => RequireLayout,
  ) => {
    let shouldLayout = false
    spineItemManager.getAll().forEach((item, index) => {
      shouldLayout = item.manipulateSpineItem((opts) => cb({ index, ...opts })) || shouldLayout
    })

    if (shouldLayout) {
      spineItemManager.layout()
    }
  }

  const manipulateSpineItem = (id: string, cb: Parameters<SpineItem[`manipulateSpineItem`]>[0]) => {
    spineItemManager.get(id)?.manipulateSpineItem(cb)
  }

  context.manifest$.pipe(tap(reload), takeUntil(context.destroy$)).subscribe()

  const waitForViewportFree$ = viewportState$.pipe(
    filter((v) => v === `free`),
    take(1),
  )

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
  const adjustPagination = (position: ViewportNavigationEntry) => {
    return waitForViewportFree$.pipe(
      tap(
        report.measurePerformance(
          `adjustPagination`,
          1,
          () => {
            const spineItemsFromPosition = spineLocator.getSpineItemsFromReadingOrderPosition(position)
            const beginSpineItem = spineItemsFromPosition
              ? spineItemManager.get(spineItemsFromPosition.begin)
              : undefined
            const endSpineItem = spineItemsFromPosition ? spineItemManager.get(spineItemsFromPosition.end) : undefined
            const beginLastCfi = pagination.getPaginationInfo().beginCfi
            const endLastCfi = pagination.getPaginationInfo().endCfi

            const shouldUpdateBeginCfi =
              pagination.getPaginationInfo().beginSpineItemIndex !== spineItemsFromPosition?.begin ||
              beginLastCfi === undefined ||
              beginLastCfi?.startsWith(`epubcfi(/0`)

            const shouldUpdateEndCfi =
              pagination.getPaginationInfo().endSpineItemIndex !== spineItemsFromPosition?.end ||
              endLastCfi === undefined ||
              endLastCfi?.startsWith(`epubcfi(/0`)

            if (beginSpineItem && endSpineItem && spineItemsFromPosition) {
              const beginPosition = spineLocator.getSpineItemPositionFromSpinePosition(
                spineItemsFromPosition.beginPosition,
                beginSpineItem,
              )
              const beginPageIndex = spineItemLocator.getSpineItemPageIndexFromPosition(beginPosition, beginSpineItem)
              const endPosition = spineLocator.getSpineItemPositionFromSpinePosition(
                spineItemsFromPosition.endPosition,
                endSpineItem,
              )
              const endPageIndex = spineItemLocator.getSpineItemPageIndexFromPosition(endPosition, endSpineItem)

              pagination.updateBeginAndEnd(
                {
                  spineItem: beginSpineItem,
                  spineItemIndex: spineItemManager.getSpineItemIndex(beginSpineItem) ?? 0,
                  pageIndex: spineItemLocator.getSpineItemPageIndexFromPosition(beginPosition, beginSpineItem),
                  cfi: shouldUpdateBeginCfi ? cfiLocator.getCfi(beginPageIndex, beginSpineItem) : beginLastCfi,
                  options: {
                    isAtEndOfChapter: false,
                  },
                },
                {
                  spineItem: endSpineItem,
                  spineItemIndex: spineItemManager.getSpineItemIndex(endSpineItem) ?? 0,
                  pageIndex: spineItemLocator.getSpineItemPageIndexFromPosition(endPosition, endSpineItem),
                  cfi: shouldUpdateEndCfi ? cfiLocator.getCfi(endPageIndex, endSpineItem) : endLastCfi,
                  options: {
                    isAtEndOfChapter: false,
                  },
                },
              )
            }
          },
          { disable: true },
        ),
      ),
    )
  }

  merge(
    spineItemManager.$.focus$.pipe(
      tap((event) => {
        // @todo track tail as well (selection, finger etc)

        const spineItem = event.data
        const fingerTracker$ = spineItem.fingerTracker.$
        const selectionTracker$ = spineItem.selectionTracker.$

        selectionSubscription?.unsubscribe()
        selectionSubscription = merge(
          selectionTracker$.pipe(
            filter((event) => event.event === `selectionchange`),
            tap((event) => {
              subject.next({
                type: `onSelectionChange`,
                data: event.data ? createSelection(event.data, spineItem.item) : null,
              })
            }),
          ),
          selectionTracker$.pipe(
            filter(({ event }) => event === `selectstart`),
            switchMap(() =>
              fingerTracker$.pipe(
                filter(({ event }) => event === `fingermove`),
                debounce(() => interval(1000)),
                takeUntil(fingerTracker$.pipe(filter(({ event }) => event === `fingerout`))),
                tap(({ data }) => {
                  if (data) {
                    // const fingerPosition = translateFramePositionIntoPage(context, pagination, data, spineItem)
                    // if (fingerPosition.x >= context.getPageSize().width) {
                    //   viewportNavigator.turnRight({ allowSpineItemChange: false })
                    // } else if (fingerPosition.x <= context.getPageSize().width) {
                    //   viewportNavigator.turnLeft({ allowSpineItemChange: false })
                    // }
                  }
                }),
              ),
            ),
          ),
        ).subscribe()
      }),
      catchError((e) => {
        Report.error(e)

        return EMPTY
      }),
      takeUntil(context.destroy$),
    ),
  ).subscribe()

  const itemUpdateOnNavigation$ = navigation$.pipe(
    tap((data) => {
      const time = report.time(`navigation`, 1)
      const currentSpineItem = spineItemManager.getFocusedSpineItem()
      const spineItemsFromPosition = spineLocator.getSpineItemsFromReadingOrderPosition(data.position)
      let beginSpineItem = spineItemsFromPosition ? spineItemManager.get(spineItemsFromPosition.begin) : undefined
      let endSpineItem = spineItemsFromPosition ? spineItemManager.get(spineItemsFromPosition.end) : undefined
      beginSpineItem = beginSpineItem || currentSpineItem
      endSpineItem = endSpineItem || currentSpineItem

      // In theory the item to focus should be either begin or end. This is because the navigation should at least take us on top
      // of it. However this is the theory, due to wrong layout / missing adjustment it could be different.
      // In case of no item to focus is detected we will just fallback to 0
      const spineItemToFocus = data.position.spineItem || beginSpineItem

      if (spineItemToFocus && spineItemToFocus !== currentSpineItem) {
        spineItemManager.focus(spineItemToFocus)
      } else if (!spineItemToFocus) {
        // we default to item 0 so if anything wrong happens during navigation we can fallback to a valid item
        spineItemManager.focus(0)
      }

      if (spineItemToFocus && beginSpineItem && endSpineItem && spineItemsFromPosition) {
        const lastExpectedNavigation = data.lastUserExpectedNavigation
        const beginItemIndex = spineItemManager.getSpineItemIndex(beginSpineItem) ?? 0
        const beginPosition = spineLocator.getSpineItemPositionFromSpinePosition(
          spineItemsFromPosition.beginPosition,
          beginSpineItem,
        )
        const beginPageIndex = spineItemLocator.getSpineItemPageIndexFromPosition(beginPosition, beginSpineItem)
        const endPosition = spineLocator.getSpineItemPositionFromSpinePosition(
          spineItemsFromPosition.endPosition,
          endSpineItem,
        )
        const endPageIndex = spineItemLocator.getSpineItemPageIndexFromPosition(endPosition, endSpineItem)
        const endItemIndex = spineItemManager.getSpineItemIndex(endSpineItem) ?? 0

        pagination.updateBeginAndEnd(
          {
            spineItem: beginSpineItem,
            spineItemIndex: beginItemIndex,
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
            cfi:
              lastExpectedNavigation?.type === `navigate-from-cfi` && spineItemToFocus === beginSpineItem
                ? lastExpectedNavigation.data
                : data.triggeredBy === `adjust` && settings.settings.computedPageTurnMode === `controlled`
                  ? pagination.getPaginationInfo().beginCfi
                  : beginItemIndex !== pagination.getPaginationInfo().beginSpineItemIndex
                    ? cfiLocator.getRootCfi(beginSpineItem)
                    : /* @todo check ? */ cfiLocator.getRootCfi(beginSpineItem),
            options: {
              isAtEndOfChapter: false,
            },
          },
          {
            spineItem: endSpineItem,
            spineItemIndex: endItemIndex,
            pageIndex: endPageIndex,
            cfi:
              lastExpectedNavigation?.type === `navigate-from-cfi` && spineItemToFocus === endSpineItem
                ? lastExpectedNavigation.data
                : data.triggeredBy === `adjust` && settings.settings.computedPageTurnMode === `controlled`
                  ? pagination.getPaginationInfo().endCfi
                  : endItemIndex !== pagination.getPaginationInfo().endSpineItemIndex
                    ? cfiLocator.getRootCfi(endSpineItem)
                    : /* @todo check ? */ cfiLocator.getRootCfi(endSpineItem),
            options: {
              isAtEndOfChapter: false,
            },
          },
        )

        report.log(`navigation$`, {
          spineItemHasChanged: spineItemToFocus !== currentSpineItem,
          item: spineItemToFocus,
          spineItemToFocus,
          index: spineItemManager.getSpineItemIndex(spineItemToFocus),
          offset: data,
          endSpineItem,
          beginSpineItem,
          lastExpectedNavigation,
          spineItemsFromPosition,
        })
      }

      time()
    }),
    share(),
    takeUntil(context.destroy$),
  )

  /**
   * Adjust heavier pagination once the navigation and items are updated.
   * This is also cancelled if the layout changes, because the layout will
   * trigger a new navigation adjustment and pagination again.
   */
  itemUpdateOnNavigation$
    .pipe(
      switchMap((data) => {
        return adjustPagination(data.position).pipe(takeUntil(spineItemManager.$.layout$))
      }),
      takeUntil(context.destroy$),
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
    navigationAdjusted$,
  )
    .pipe(
      switchMap(() => {
        return waitForViewportFree$.pipe(
          withLatestFrom(currentNavigationPosition$),
          map(([, currentNavigationPosition]) => {
            const focusedSpineItemIndex = spineItemManager.getFocusedSpineItemIndex()

            report.log(`update contents`, { focusedSpineItemIndex })

            if (focusedSpineItemIndex === undefined) return

            const { begin = focusedSpineItemIndex, end = focusedSpineItemIndex } =
              spineLocator.getSpineItemsFromReadingOrderPosition(currentNavigationPosition) || {}

            if (begin !== focusedSpineItemIndex && end !== focusedSpineItemIndex) {
              Report.warn(`Current viewport is not in sync with focus item, load from focus item rather than viewport`)
              spineItemManager.loadContents([focusedSpineItemIndex, focusedSpineItemIndex])
            } else {
              spineItemManager.loadContents([begin, end])
            }
          }),
          take(1),
        )
      }),
      takeUntil(context.destroy$),
    )
    .subscribe()

  const elementSub = element$.pipe().subscribe((element) => {
    const containerElement = createContainerElement(element.ownerDocument)

    containerElement$.next(containerElement)
  })

  return {
    element$: containerElement$,
    getElement: () => containerElement$.getValue(),
    locator: spineLocator,
    spineItemLocator,
    cfiLocator,
    manipulateSpineItems,
    manipulateSpineItem,
    destroy: () => {
      elementSub.unsubscribe()
      spineItems$.complete()
      itemsBeforeDestroySubject$.next()
      itemsBeforeDestroySubject$.complete()
      subject.complete()
      spineItemManager.destroy()
      selectionSubscription?.unsubscribe()
      containerElement$.getValue().remove()
    },
    adjustPagination,
    isSelecting: () => spineItemManager.getFocusedSpineItem()?.selectionTracker.isSelecting(),
    getSelection: () => spineItemManager.getFocusedSpineItem()?.selectionTracker.getSelection(),
    $: {
      $: subject.asObservable(),
      layout$: spineItemManager.$.layout$,
      spineItems$: spineItems$.asObservable(),
      itemsBeforeDestroy$: itemsBeforeDestroySubject$.asObservable(),
    },
  }
}

const createContainerElement = (doc: Document) => {
  const element: HTMLElement = doc.createElement(`div`)
  element.style.cssText = `
    height: 100%;
    position: relative;
  `
  element.className = `${HTML_PREFIX}-spine`

  return element
}

export { Spine }
