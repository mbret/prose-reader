import { BehaviorSubject, merge, of, Subject } from "rxjs"
import { filter, switchMap } from "rxjs/operators"
import { Context } from "../../context"
import { ReadingItemManager } from "../../readingItemManager"
import { Report } from "../../report"
import { createNavigationResolver, ViewportNavigationEntry } from "../navigationResolver"
import { createLocationResolver } from "../locationResolver"
import { ViewportPosition } from "../../types"

const NAMESPACE = `panViewportNavigator`

type SnapNavigation = { type: `snap`, data: { from: ViewportNavigationEntry, to: ViewportNavigationEntry, pan: { x: number, y: number } } }

export const createPanViewportNavigator = ({ getCurrentViewportPosition, navigator, readingItemManager, locator, context, currentNavigationSubject$ }: {
  context: Context,
  element: HTMLElement,
  navigator: ReturnType<typeof createNavigationResolver>,
  currentNavigationSubject$: BehaviorSubject<ViewportNavigationEntry>,
  readingItemManager: ReadingItemManager,
  locator: ReturnType<typeof createLocationResolver>,
  getCurrentViewportPosition: () => ViewportPosition
}) => {
  const navigationTriggerSubject$ = new Subject<
    | SnapNavigation
  >()
  const stateSubject$ = new BehaviorSubject<`end` | `start`>(`end`)
  let movingLastDelta = { x: 0, y: 0 }
  let movingLastPosition = { x: 0, y: 0 }
  const moveToSubject$ = new Subject<{ position: ViewportNavigationEntry }>()

  /**
   * @prototype
   */
  const moveTo = Report.measurePerformance(`${NAMESPACE} moveTo`, 5, (delta: { x: number, y: number } | undefined, { final, start }: { start?: boolean, final?: boolean } = {}) => {
    if (context.getSettings().computedPageTurnMode === `scrollable`) {
      Report.warn(`pan control is not available on free page turn mode`)
      return
    }

    const pageTurnDirection = context.getSettings().computedPageTurnDirection

    if (start) {
      stateSubject$.next(`start`)
      movingLastDelta = { x: 0, y: 0 }
      movingLastPosition = getCurrentViewportPosition()
    }

    let navigation = currentNavigationSubject$.value

    if (delta) {
      const correctedX = delta.x - (movingLastDelta?.x || 0)
      const correctedY = delta.y - (movingLastDelta?.y || 0)

      navigation = navigator.wrapPositionWithSafeEdge({
        x: pageTurnDirection === `horizontal`
          ? context.isRTL()
            ? movingLastPosition.x + correctedX
            : movingLastPosition.x - correctedX
          : 0,
        y: pageTurnDirection === `horizontal` ? 0 : movingLastPosition.y - correctedY
      })

      movingLastDelta = delta
    } else {
      navigation = getCurrentViewportPosition()
    }

    movingLastPosition = navigation

    if (final) {
      movingLastDelta = { x: 0, y: 0 }

      snapTo({
        from: currentNavigationSubject$.value,
        to: navigation,
        pan: movingLastPosition
      })
      stateSubject$.next(`end`)

      return
    }

    moveToSubject$.next({ position: navigation })
  }, { disable: false })

  const snapTo = (data: SnapNavigation[`data`]) => {
    navigationTriggerSubject$.next({ type: `snap`, data })
  }

  const getLastUserExpectedNavigation = Report.measurePerformance(`turnTo`, 10, (navigation: ViewportNavigationEntry, { allowReadingItemChange = true }: { allowReadingItemChange?: boolean } = {}) => {
    const currentReadingItem = readingItemManager.getFocusedReadingItem()

    if (!currentReadingItem) return undefined

    const newReadingItem = locator.getReadingItemFromPosition(navigation) || currentReadingItem
    const readingItemHasChanged = newReadingItem !== currentReadingItem

    if (readingItemHasChanged) {
      if (allowReadingItemChange) {
        if (readingItemManager.comparePositionOf(newReadingItem, currentReadingItem) === `before`) {
          return { type: `navigate-from-next-item` as const }
        } else {
          return { type: `navigate-from-previous-item` as const }
        }
      }
    } else {
      return undefined
    }
  })

  const snapNavigation$ = navigationTriggerSubject$
    .pipe(
      filter((e): e is SnapNavigation => e.type === `snap`),
      switchMap(({ data: { from, to } }) => {
        const pageTurnDirection = context.getSettings().computedPageTurnDirection
        const movingForward = navigator.isNavigationGoingForwardFrom(to, from)
        const triggerPercentage = movingForward ? 0.7 : 0.3
        const triggerXPosition = pageTurnDirection === `horizontal`
          ? to.x + (context.getVisibleAreaRect().width * triggerPercentage)
          : 0
        const triggerYPosition = pageTurnDirection === `horizontal`
          ? 0
          : to.y + (context.getVisibleAreaRect().height * triggerPercentage)
        const midScreenPositionSafePosition = navigator.wrapPositionWithSafeEdge({ x: triggerXPosition, y: triggerYPosition })
        const finalNavigation = navigator.getNavigationForPosition(midScreenPositionSafePosition)
        const lastUserExpectedNavigation = getLastUserExpectedNavigation(finalNavigation)

        // @todo return an animation interpolation based on the distance

        return of({ ...finalNavigation, lastUserExpectedNavigation })
      })
    )

  const destroy = () => {
    moveToSubject$.complete()
    stateSubject$.complete()
  }

  return {
    moveTo,
    destroy,
    adjustReadingOffset: (_: { x: number, y: number }) => {
      return false
    },
    $: {
      moveToSubject$,
      state$: stateSubject$.asObservable(),
      navigation$: merge(
        snapNavigation$
      )
    }
  }
}
