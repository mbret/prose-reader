import type { HookManager, Reader } from "@prose-reader/core"
import { combineLatest, EMPTY, filter, first, map, of, switchMap } from "rxjs"
import type { GestureRecognizable, Hook } from "../types"
import type { GesturesSettingsManager } from "../SettingsManager"
import { isNotLink, istMatchingSelectors } from "../utils"

export const registerTaps = ({
  reader,
  recognizable,
  hookManager,
  settingsManager,
}: {
  recognizable: GestureRecognizable
  reader: Reader
  hookManager: HookManager<Hook>
  settingsManager: GesturesSettingsManager
}) => {
  const gestures$ = recognizable.events$.pipe(
    switchMap((event) => {
      const normalizedEvent = event.event
      const { computedPageTurnDirection } = reader.settings.values

      if (
        event.type === "tap" &&
        isNotLink(event) &&
        !istMatchingSelectors(settingsManager.values.ignore, event)
      ) {
        const width = window.innerWidth
        const height = window.innerHeight
        const pageTurnMargin = 0.15

        if (`x` in normalizedEvent) {
          const { x = 0, y } = normalizedEvent

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
