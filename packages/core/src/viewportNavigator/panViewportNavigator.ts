import { BehaviorSubject, merge, of, Subject, withLatestFrom } from "rxjs"
import { filter, switchMap } from "rxjs/operators"
import { Context } from "../context/Context"
import { SpineItemManager } from "../spineItemManager"
import { Report } from "../report"
import { createNavigationResolver, ViewportNavigationEntry } from "../spine/navigationResolver"
import { createLocationResolver } from "../spine/locationResolver"
import { ViewportPosition } from "../types"
import { SettingsManager } from "../settings/SettingsManager"

const NAMESPACE = `panViewportNavigator`

type SnapNavigation = {
  type: `snap`
  data: { from: ViewportNavigationEntry; to: ViewportNavigationEntry; pan: { x: number; y: number } }
}

export const createPanViewportNavigator = ({
  getCurrentViewportPosition,
  navigator,
  spineItemManager,
  locator,
  context,
  currentNavigationSubject$,
  settings,
}: {
  context: Context
  navigator: ReturnType<typeof createNavigationResolver>
  currentNavigationSubject$: BehaviorSubject<ViewportNavigationEntry>
  spineItemManager: SpineItemManager
  locator: ReturnType<typeof createLocationResolver>
  getCurrentViewportPosition: () => ViewportPosition
  settings: SettingsManager
}) => {
  const navigationTriggerSubject$ = new Subject<SnapNavigation>()
  const stateSubject$ = new BehaviorSubject<`end` | `start`>(`end`)
  let movingLastDelta = { x: 0, y: 0 }
  let movingLastPosition = { x: 0, y: 0 }
  const moveToSubject$ = new Subject<{ position: ViewportNavigationEntry }>()

  /**
   * @prototype
   */
  const moveTo = Report.measurePerformance(
    `${NAMESPACE} moveTo`,
    5,
    (delta: { x: number; y: number } | undefined, { final, start }: { start?: boolean; final?: boolean } = {}) => {
      if (settings.settings.computedPageTurnMode === `scrollable`) {
        Report.warn(`pan control is not available on free page turn mode`)
        return
      }

      const pageTurnDirection = settings.settings.computedPageTurnDirection

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
          x: pageTurnDirection === `horizontal` ? movingLastPosition.x - correctedX : 0,
          y: pageTurnDirection === `horizontal` ? 0 : movingLastPosition.y - correctedY,
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
          pan: movingLastPosition,
        })
        stateSubject$.next(`end`)

        return
      }

      moveToSubject$.next({ position: navigation })
    },
    { disable: false },
  )

  const snapTo = (data: SnapNavigation[`data`]) => {
    navigationTriggerSubject$.next({ type: `snap`, data })
  }

  const getLastUserExpectedNavigation = Report.measurePerformance(
    `turnTo`,
    10,
    (navigation: ViewportNavigationEntry, { allowSpineItemChange = true }: { allowSpineItemChange?: boolean } = {}) => {
      const currentSpineItem = spineItemManager.getFocusedSpineItem()

      if (!currentSpineItem) return undefined

      const newSpineItem = locator.getSpineItemFromPosition(navigation) || currentSpineItem
      const spineItemHasChanged = newSpineItem !== currentSpineItem

      if (spineItemHasChanged) {
        if (allowSpineItemChange) {
          if (spineItemManager.comparePositionOf(newSpineItem, currentSpineItem) === `before`) {
            return { type: `navigate-from-next-item` as const }
          } else {
            return { type: `navigate-from-previous-item` as const }
          }
        }
      } else {
        return undefined
      }
    },
  )

  const snapNavigation$ = navigationTriggerSubject$.pipe(
    filter((e): e is SnapNavigation => e.type === `snap`),
    withLatestFrom(settings.settings$),
    switchMap(
      ([
        {
          data: { from, to },
        },
        { navigationSnapThreshold },
      ]) => {
        const pageTurnDirection = settings.settings.computedPageTurnDirection
        const movingForward = navigator.isNavigationGoingForwardFrom(to, from)
        const triggerPercentage = movingForward ? 1 - navigationSnapThreshold : navigationSnapThreshold
        const triggerXPosition =
          pageTurnDirection === `horizontal` ? to.x + context.state.visibleAreaRect.width * triggerPercentage : 0
        const triggerYPosition =
          pageTurnDirection === `horizontal` ? 0 : to.y + context.state.visibleAreaRect.height * triggerPercentage
        const midScreenPositionSafePosition = navigator.wrapPositionWithSafeEdge({
          x: triggerXPosition,
          y: triggerYPosition,
        })
        const finalNavigation = navigator.getNavigationForPosition(midScreenPositionSafePosition)
        const lastUserExpectedNavigation = getLastUserExpectedNavigation(finalNavigation)

        // @todo return an animation interpolation based on the distance

        return of({ ...finalNavigation, lastUserExpectedNavigation })
      },
    ),
  )

  const destroy = () => {
    moveToSubject$.complete()
    stateSubject$.complete()
  }

  return {
    moveTo,
    destroy,
    adjustReadingOffset: () => {
      return false
    },
    $: {
      moveToSubject$,
      state$: stateSubject$.asObservable(),
      navigation$: merge(snapNavigation$),
    },
  }
}
