import { HookManager, Reader } from "@prose-reader/core"
import { Subject, tap } from "rxjs"
import { GestureEvent, GestureRecognizable, Hook } from "../types"
import { GesturesSettingsManager } from "../SettingsManager"

export const registerTaps = ({
  reader,
  recognizable,
  unhandledEvent$,
  hookManager,
}: {
  recognizable: GestureRecognizable
  reader: Reader
  hookManager: HookManager<Hook>
  unhandledEvent$: Subject<GestureEvent>
  settingsManager: GesturesSettingsManager
}) => {
  const gestures$ = recognizable.events$.pipe(
    tap((event) => {
      const normalizedEvent = event.event
      const { computedPageTurnDirection } = reader.settings.values

      if (event.type === "tap") {
        const width = window.innerWidth
        const height = window.innerHeight
        const pageTurnMargin = 0.15

        if (`x` in normalizedEvent) {
          const { x = 0, y } = normalizedEvent

          const beforeTapResults = hookManager.execute("beforeTap", undefined, { event })

          if (beforeTapResults.some((result) => result === false)) {
            return
          }

          const isTopArea = y < height * pageTurnMargin
          const isBottomArea = y > height * (1 - pageTurnMargin)
          const isLeftArea = x < width * pageTurnMargin
          const isRightArea = x > width * (1 - pageTurnMargin)

          if (isLeftArea && computedPageTurnDirection === "horizontal") {
            reader.navigation.turnLeftOrTop()
          } else if (isTopArea && computedPageTurnDirection === "vertical") {
            reader.navigation.turnLeftOrTop()
          } else if (isBottomArea && computedPageTurnDirection === "vertical") {
            reader.navigation.turnRightOrBottom()
          } else if (isRightArea && computedPageTurnDirection === "horizontal") {
            reader.navigation.turnRightOrBottom()
          } else {
            unhandledEvent$.next(event)
          }
        }
      }
    }),
  )

  return gestures$
}
