import type { HookManager, Reader } from "@prose-reader/core"
import type { SwipeEvent } from "gesturx"
import { EMPTY, filter, map, switchMap, tap } from "rxjs"
import type { GesturesSettingsManager } from "../SettingsManager"
import type { GestureEvent, GestureRecognizable, Hook } from "../types"

const isSwipeEvent = (event: GestureEvent["event"]): event is SwipeEvent =>
  event.type === "swipe"

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
            map(({ event }) => event),
            filter(isSwipeEvent),
            tap((event) => {
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
            map((event) => ({ type: "swipe" as const, gestureEvent: event })),
          ),
    ),
  )

  return gestures$
}
