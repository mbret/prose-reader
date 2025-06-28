import type { HookManager, Reader } from "@prose-reader/core"
import { EMPTY, filter, map, switchMap, tap } from "rxjs"
import type { GesturesSettingsManager } from "../SettingsManager"
import type { GestureRecognizable, Hook } from "../types"

export const registerSwipe = ({
  reader,
  recognizable,
  settingsManager,
}: {
  recognizable: GestureRecognizable
  reader: Reader
  hookManager: HookManager<Hook>
  settingsManager: GesturesSettingsManager
}) => {
  const gestures$ = settingsManager.values$.pipe(
    switchMap(({ panNavigation }) =>
      panNavigation !== "swipe"
        ? EMPTY
        : recognizable.events$.pipe(
            filter(({ event }) => event.type === "swipe"),
            tap(({ event }) => {
              const { computedPageTurnDirection } = reader.settings.values

              if (computedPageTurnDirection === "vertical") {
                if (event.velocityY < -0.5) {
                  reader?.navigation.turnRight()
                }
                if (event.velocityY > 0.5) {
                  reader?.navigation.turnLeft()
                }
              } else {
                if (event.velocityX < -0.5) {
                  reader?.navigation.turnRight()
                }
                if (event.velocityX > 0.5) {
                  reader?.navigation.turnLeft()
                }
              }
            }),
            map((event) => ({ event, handled: true })),
          ),
    ),
  )

  return gestures$
}
