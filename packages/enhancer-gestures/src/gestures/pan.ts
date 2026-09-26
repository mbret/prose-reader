import type { HookManager, Reader } from "@prose-reader/core"
import type { PanRecognizer } from "gesturx"
import { filter, finalize, map, merge, of, switchMap, tap } from "rxjs"
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

          /**
           * Whether this pan moves the page through the pan navigator, which
           * holds the navigation until it is stopped. However the pan ends,
           * it stops it, or the navigation stays held until the next pan.
           */
          let isPanningThePage = false

          const stopPanningThePage = (delta: { x: number; y: number }) => {
            if (!isPanningThePage) return

            isPanningThePage = false

            if (reader.navigation.panNavigator.value.isStarted)
              reader.navigation.panNavigator.stop(delta)
          }

          const moveAndEnd$ = merge(panMove$, panEnd$).pipe(
            tap((event) => {
              const isZooming = reader.zoom.state.isZooming
              const isZoomingIn = reader.zoom.state.currentScale > 1

              /**
               * When user is zooming in, we don't navigate anymore.
               * We still allow the pan gesture to move the zoomed controlled
               * viewport even when pan navigation itself is disabled.
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

                // A page moved before the zoom began lands where it was left.
                if (event.type === `panEnd`)
                  stopPanningThePage(
                    reader.navigation.panNavigator.value.lastDelta,
                  )

                return
              }

              if (panNavigation !== "pan") return

              if (event.type === `panMove`) {
                isPanningThePage = true

                if (!reader.navigation.panNavigator.value.isStarted) {
                  reader.navigation.panNavigator.start({
                    x: event.deltaX,
                    y: event.deltaY,
                  })

                  return
                }

                reader.navigation.panNavigator.panMoveTo({
                  x: event.deltaX,
                  y: event.deltaY,
                })

                return
              }

              stopPanningThePage({ x: event.deltaX, y: event.deltaY })
            }),
            /**
             * Torn down before it ended, as when the gestures settings change
             * mid-pan, the pan still lands where it was left.
             */
            finalize(() => {
              stopPanningThePage(reader.navigation.panNavigator.value.lastDelta)
            }),
          )

          return merge(of(panStartEvent), moveAndEnd$).pipe(
            map((event) => ({
              type: "pan" as const,
              gestureEvent: event,
            })),
          )
        }),
      )

      return pan$
    }),
  )

  return gestures$
}
