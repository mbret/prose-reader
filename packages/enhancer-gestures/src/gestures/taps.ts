import { HookManager, Reader } from "@prose-reader/core"
import { combineLatest, EMPTY, first, map, of, switchMap } from "rxjs"
import { GestureRecognizable, Hook } from "../types"
import { GesturesSettingsManager } from "../SettingsManager"
import { isNotLink } from "../utils"

export const registerTaps = ({
  reader,
  recognizable,
  hookManager,
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

      if (event.type === "tap" && isNotLink(event)) {
        const width = window.innerWidth
        const height = window.innerHeight
        const pageTurnMargin = 0.15

        if (`x` in normalizedEvent) {
          const { x = 0, y } = normalizedEvent

          const beforeTapResults$ = hookManager.execute("beforeTap", undefined, { event })

          return combineLatest([...beforeTapResults$, of(true)]).pipe(
            first(),
            map((results) => {
              if (results.some((result) => result === false)) {
                return EMPTY
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
