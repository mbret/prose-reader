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
          const startZoomPosition = reader.zoom.state.currentPosition

          const moveAndEnd$ = merge(panMove$, panEnd$).pipe(
            map((event) => {
              const isZooming = reader.zoom.state.isZooming
              const isZoomingIn = reader.zoom.state.currentScale > 1

              if (isZooming && isZoomingIn) {
                const x = startZoomPosition.x + Math.floor(event.deltaX)
                const y = startZoomPosition.y + Math.floor(event.deltaY)

                reader.zoom.move({
                  x,
                  y,
                })

                return { event, handled: true }
              }

              if (event.type === `panMove`) {
                reader.navigation.moveTo({
                  x: event.deltaX,
                  y: event.deltaY,
                })

                return { event, handled: true }
              }

              if (event.type === `panEnd`) {
                reader.navigation.moveTo(
                  { x: event.deltaX, y: event.deltaY },
                  { final: true },
                )

                return { event, handled: true }
              }

              return { event, handled: false }
            }),
          )

          const isZoomingIn = reader.zoom.state.currentScale > 1

          if (!isZoomingIn) {
            reader?.navigation.moveTo({ x: 0, y: 0 }, { start: true })

            return merge(
              of({ event: panStartEvent, handled: true }),
              moveAndEnd$,
            )
          }

          return merge(
            of({ event: panStartEvent, handled: false }),
            moveAndEnd$,
          )
        }),
      )

      return pan$
    }),
  )

  return gestures$
}
