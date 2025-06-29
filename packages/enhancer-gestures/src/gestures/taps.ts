import type { HookManager, Reader } from "@prose-reader/core"
import type { TapRecognizer } from "gesturx"
import {
  EMPTY,
  combineLatest,
  filter,
  first,
  map,
  of,
  switchMap,
  withLatestFrom,
} from "rxjs"
import type { GesturesSettingsManager } from "../SettingsManager"
import type { GestureRecognizable, Hook } from "../types"
import {
  getPositionRelativeToContainer,
  isNotLink,
  istMatchingSelectors,
} from "../utils"

const calculatePageTurnMargin = (screenWidth: number): number => {
  const minMargin = 0.15
  const maxMargin = 0.3
  const minWidth = 400
  const maxWidth = 1200

  if (screenWidth <= minWidth) return maxMargin
  if (screenWidth >= maxWidth) return minMargin

  // Linear interpolation between min and max
  const ratio = (screenWidth - minWidth) / (maxWidth - minWidth)
  return maxMargin - ratio * (maxMargin - minMargin)
}

export const registerTaps = ({
  reader,
  recognizable,
  hookManager,
  settingsManager,
  recognizer,
}: {
  recognizable: GestureRecognizable
  reader: Reader
  hookManager: HookManager<Hook>
  recognizer: TapRecognizer
  settingsManager: GesturesSettingsManager
}) => {
  const gestures$ = recognizable.events$.pipe(
    filter((event) => event.recognizer === recognizer),
    withLatestFrom(reader.context.containerElementRect$),
    switchMap(([{ event }, containerElementRect]) => {
      if (!containerElementRect) return EMPTY

      const normalizedEvent = event.event
      const { computedPageTurnDirection } = reader.settings.values

      if (
        event.type === "tap" &&
        isNotLink(event) &&
        !istMatchingSelectors(settingsManager.values.ignore, event)
      ) {
        if (`x` in normalizedEvent) {
          const width = containerElementRect.width
          const height = containerElementRect.height
          const pageTurnMargin = calculatePageTurnMargin(width)
          const { x, y } = getPositionRelativeToContainer(
            normalizedEvent,
            containerElementRect,
          )

          const beforeTapResults$ = hookManager.execute(
            "beforeGesture",
            undefined,
            { event$: of(event) },
          )

          return combineLatest([...beforeTapResults$, of(true)]).pipe(
            first(),
            filter((results) => !results.some((result) => result === false)),
            map(() => {
              const isTopArea = y < height * pageTurnMargin
              const isBottomArea = y > height * (1 - pageTurnMargin)
              const isLeftArea = x < width * pageTurnMargin
              const isRightArea = x > width * (1 - pageTurnMargin)

              if (isLeftArea && computedPageTurnDirection === "horizontal") {
                reader.navigation.turnLeftOrTop()
              } else if (
                isTopArea &&
                computedPageTurnDirection === "vertical"
              ) {
                reader.navigation.turnLeftOrTop()
              } else if (
                isBottomArea &&
                computedPageTurnDirection === "vertical"
              ) {
                reader.navigation.turnRightOrBottom()
              } else if (
                isRightArea &&
                computedPageTurnDirection === "horizontal"
              ) {
                reader.navigation.turnRightOrBottom()
              } else {
                return { event, handled: false }
              }

              return { event, handled: true }
            }),
          )
        }
      }

      return EMPTY
    }),
  )

  return gestures$
}
