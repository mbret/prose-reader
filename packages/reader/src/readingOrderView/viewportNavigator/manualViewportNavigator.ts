import { BehaviorSubject, EMPTY, merge, of, Subject } from "rxjs"
import { filter, map, switchMap, tap, withLatestFrom } from "rxjs/operators"
import { Context } from "../../context"
import { ReadingItemManager } from "../../readingItemManager"
import { Report } from "../../report"
import { createNavigationResolver, ViewportNavigationEntry } from "../navigationResolver"
import { createLocationResolver } from "../locationResolver"

const NAMESPACE = `manualViewportNavigator`

type UrlNavigation = { type: `url`, data: string | URL }
type SpineItemNavigation = { type: `spineItem`, data: { indexOrId: number | string, animate: boolean } }
type CfiNavigation = { type: `cfi`, data: { cfi: string, animate: boolean } }
type ChapterPageNavigation = { type: `chapterPage`, data: { pageIndex: number } }
type PageNavigation = { type: `page`, data: { pageIndex: number } }
type LeftPageNavigation = { type: `leftPage`, data: { allowReadingItemChange: boolean } }
type RightPageNavigation = { type: `rightPage`, data: { allowReadingItemChange: boolean } }

export const createManualViewportNavigator = ({ navigator, readingItemManager, currentNavigationSubject$, locator, context }: {
  context: Context,
  element: HTMLElement,
  navigator: ReturnType<typeof createNavigationResolver>,
  currentNavigationSubject$: BehaviorSubject<ViewportNavigationEntry>,
  readingItemManager: ReadingItemManager,
  locator: ReturnType<typeof createLocationResolver>,
}) => {
  const navigationTriggerSubject$ = new Subject<
    | UrlNavigation
    | SpineItemNavigation
    | CfiNavigation
    | ChapterPageNavigation
    | PageNavigation
    | LeftPageNavigation
    | RightPageNavigation
  >()

  const turnLeft = ({ allowReadingItemChange = true }: { allowReadingItemChange?: boolean } = {}) =>
    navigationTriggerSubject$.next({ type: `leftPage`, data: { allowReadingItemChange } })

  const turnRight = ({ allowReadingItemChange = true }: { allowReadingItemChange?: boolean } = {}) =>
    navigationTriggerSubject$.next({ type: `rightPage`, data: { allowReadingItemChange } })

  // @todo it's wrong because we can be in two different chapter on same page for spread
  const goToPageOfCurrentChapter = (pageIndex: number) =>
    navigationTriggerSubject$.next({ type: `chapterPage`, data: { pageIndex } })

  const goToPage = (pageIndex: number) =>
    navigationTriggerSubject$.next({ type: `page`, data: { pageIndex } })

  const goToCfi = (cfi: string, options: { animate: boolean } = { animate: true }) =>
    navigationTriggerSubject$.next({ type: `cfi`, data: { cfi, ...options } })

  const goToUrl = (url: string | URL) =>
    navigationTriggerSubject$.next({ type: `url`, data: url })

  const goToSpineItem = (indexOrId: number | string, options: { animate: boolean } = { animate: true }) =>
    navigationTriggerSubject$.next({ type: `spineItem`, data: { indexOrId, ...options } })

  // @todo turn into turnTo$
  const turnTo = Report.measurePerformance(`turnTo`, 10, (navigation: ViewportNavigationEntry, { allowReadingItemChange = true }: { allowReadingItemChange?: boolean } = {}) => {
    const currentReadingItem = readingItemManager.getFocusedReadingItem()

    if (!currentReadingItem) return

    const newReadingItem = locator.getReadingItemFromPosition(navigation) || currentReadingItem
    const readingItemHasChanged = newReadingItem !== currentReadingItem

    if (readingItemHasChanged) {
      if (allowReadingItemChange) {
        if (readingItemManager.comparePositionOf(newReadingItem, currentReadingItem) === `before`) {
          return { ...navigation, lastUserExpectedNavigation: { type: `navigate-from-next-item` as const }, animate: true }
        } else {
          return { ...navigation, lastUserExpectedNavigation: { type: `navigate-from-previous-item` as const }, animate: true }
        }
      }
    } else {
      return { ...navigation, lastUserExpectedNavigation: undefined, animate: true }
    }
  })

  const turnTo$ = Report.measurePerformance(`turnTo`, 10, (navigation: ViewportNavigationEntry, { allowReadingItemChange = true }: { allowReadingItemChange?: boolean } = {}) => {
    const finalNavigation = turnTo(navigation, { allowReadingItemChange })

    return finalNavigation ? of(finalNavigation) : EMPTY
  })

  const urlNavigation$ = navigationTriggerSubject$
    .pipe(
      filter((e): e is UrlNavigation => e.type === `url`),
      switchMap(({ data }) => {
        const navigation = navigator.getNavigationForUrl(data)

        if (navigation) {
          return of({ ...navigation, animate: true, lastUserExpectedNavigation: { type: `navigate-from-anchor` as const, data: navigation.url.hash } })
        }

        return EMPTY
      })
    )

  const spineItemNavigation$ = navigationTriggerSubject$
    .pipe(
      filter((e): e is SpineItemNavigation => e.type === `spineItem`),
      switchMap(({ data: { animate, indexOrId } }) => {
        const navigation = navigator.getNavigationForSpineIndexOrId(indexOrId)

        // always want to be at the beginning of the item
        const lastUserExpectedNavigation = { type: `navigate-from-previous-item` as const }

        Report.log(NAMESPACE, `goToSpineItem`, { indexOrId, animate, navigation })

        return of({ ...navigation, animate, lastUserExpectedNavigation })
      })
    )

  const cfiNavigation$ = navigationTriggerSubject$
    .pipe(
      filter((e): e is CfiNavigation => e.type === `cfi`),
      map(({ data: { animate, cfi } }) => {
        const navigation = navigator.getNavigationForCfi(cfi)

        Report.log(NAMESPACE, `goToCfi`, { cfi, animate, navigation })

        return ({
          ...navigation, animate, lastUserExpectedNavigation: { type: `navigate-from-cfi` as const, data: cfi }
        })
      })
    )

  const chapterPageNavigation$ = navigationTriggerSubject$
    .pipe(
      filter((e): e is ChapterPageNavigation => e.type === `chapterPage`),
      switchMap(({ data: { pageIndex } }) => {
        const readingItem = readingItemManager.getFocusedReadingItem()

        if (readingItem) {
          const navigation = navigator.getNavigationForPage(pageIndex, readingItem)

          return of({ ...navigation, lastUserExpectedNavigation: undefined, animate: true })
        }

        return EMPTY
      })
    )

  const pageNavigation$ = navigationTriggerSubject$
    .pipe(
      filter((e): e is PageNavigation => e.type === `page`),
      filter(_ => {
        if (context.getManifest()?.renditionLayout === `reflowable`) {
          Report.warn(`This method only works for pre-paginated content`)
          return false
        }

        return true
      }),
      switchMap(({ data: { pageIndex } }) => {
        return of({
          ...navigator.getNavigationForPage(pageIndex),
          lastUserExpectedNavigation: undefined,
          animate: true
        })
      })
    )

  const leftPageNavigation$ = navigationTriggerSubject$
    .pipe(
      filter((e): e is LeftPageNavigation => e.type === `leftPage`),
      withLatestFrom(currentNavigationSubject$),
      switchMap(([{ data: { allowReadingItemChange } }, currentNavigation]) => {
        const navigation = navigator.getNavigationForLeftPage(currentNavigation)

        return turnTo$(navigation, { allowReadingItemChange })
      })
    )

  const rightPageNavigation$ = navigationTriggerSubject$
    .pipe(
      filter((e): e is RightPageNavigation => e.type === `rightPage`),
      withLatestFrom(currentNavigationSubject$),
      switchMap(([{ data: { allowReadingItemChange } }, currentNavigation]) => {
        const navigation = navigator.getNavigationForRightPage(currentNavigation)

        return turnTo$(navigation, { allowReadingItemChange })
      })
    )

  return {
    turnLeft,
    turnRight,
    goToCfi,
    goToPageOfCurrentChapter,
    goToSpineItem,
    goToUrl,
    turnTo,
    goToPage,
    $: {
      navigation$: merge(
        urlNavigation$,
        spineItemNavigation$,
        chapterPageNavigation$,
        leftPageNavigation$,
        rightPageNavigation$,
        // for some reason after too much item ts complains
        merge(
          cfiNavigation$,
          pageNavigation$
        )
      )
        .pipe(
          /**
           * Ideally when manually navigating we expect the navigation to be different from the previous one.
           * This is because manual navigation is not used with scroll where you can move within the same item. A manual
           * navigation would theoretically always move to different items.
           */
          withLatestFrom(currentNavigationSubject$),
          filter(([navigation, currentNavigation]) => navigator.areNavigationDifferent(navigation, currentNavigation)),
          map(([navigation]) => navigation)
        )
    }
  }
}