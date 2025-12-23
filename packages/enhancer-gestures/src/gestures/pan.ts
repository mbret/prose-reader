import type { HookManager, Reader } from "@prose-reader/core"
import type { PanRecognizer } from "gesturx"
import { EMPTY, filter, map, merge, of, switchMap } from "rxjs"
import type { GesturesSettingsManager } from "../SettingsManager"
import type { Hook } from "../types"

export const registerPan = ({
  reader,
  recognizer,
  settingsManager,
}: {
  recognizer: PanRecognizer
  reader: Reader
  hookManager: HookManager<Hook>
  settingsManager: GesturesSettingsManager
}) => {
  const gestures$ = settingsManager.values$.pipe(
    switchMap(({ panNavigation }) => {
      if (panNavigation !== "pan") return EMPTY

      const panStart$ = recognizer.events$.pipe(
        filter((event) => event.type === `panStart`),
      )
      const panMove$ = recognizer.events$.pipe(
        filter((event) => event.type === `panMove`),
      )
      const panEnd$ = recognizer.events$.pipe(
        filter((event) => event.type === `panEnd`),
      )

      const pan$ = panStart$.pipe(
        switchMap((panStartEvent) => {
          /**
           * We use the last cumulative delta to derive the new event atomic delta.
           * This is because panning the zoom does not necessarily means the zoom position
           * will always changes. If the user keep dragging while the zoom is blocked, we want
           * it to move the other direction when he start dragging the other way.
           * We cannot use the `reader.zoom.state.currentPosition` as previous position
           * and the event.deltaX to compute the new zoom position.
           */
          let lastDelta = { x: 0, y: 0 }

          const moveAndEnd$ = merge(panMove$, panEnd$).pipe(
            map((event) => {
              const isZooming = reader.zoom.state.isZooming
              const isZoomingIn = reader.zoom.state.currentScale > 1

              /**
               * When user is zooming in, we don't navigate anymore.
               * The gestures is gonna be handled by the pinch and viewport.
               */
              if (isZooming && isZoomingIn) {
                const deltaX = event.deltaX - lastDelta.x
                const deltaY = event.deltaY - lastDelta.y

                lastDelta = {
                  x: event.deltaX,
                  y: event.deltaY,
                }

                reader.zoom.move(
                  {
                    x: reader.zoom.state.currentPosition.x + deltaX,
                    y: reader.zoom.state.currentPosition.y + deltaY,
                  },
                  {
                    constrain: "within-viewport",
                  },
                )

                return event
              }

              if (event.type === `panMove`) {
                if (!reader.navigation.panNavigator.value.isStarted) {
                  reader.navigation.panNavigator.start({
                    x: event.deltaX,
                    y: event.deltaY,
                  })

                  return event
                }

                reader.navigation.panNavigator.panMoveTo({
                  x: event.deltaX,
                  y: event.deltaY,
                })

                return event
              }

              if (
                event.type === `panEnd` &&
                reader.navigation.panNavigator.value.isStarted
              ) {
                reader.navigation.panNavigator.stop({
                  x: event.deltaX,
                  y: event.deltaY,
                })

                return event
              }

              return event
            }),
          )

          return merge(of(panStartEvent), moveAndEnd$).pipe(
            map((event) => ({ type: "pan" as const, gestureEvent: event })),
          )
        }),
      )

      return pan$
    }),
  )

  return gestures$
}
