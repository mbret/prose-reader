import type { Reader } from "@prose-reader/core"
import type { PinchEvent } from "gesturx"
import { filter, map, switchMap, tap, withLatestFrom } from "rxjs"
import type { GesturesSettingsManager } from "../SettingsManager"
import type { GestureRecognizable } from "../types"

export const registerPinch = ({
  reader,
  recognizable,
  settingsManager,
}: {
  recognizable: GestureRecognizable
  reader: Reader
  settingsManager: GesturesSettingsManager
}) => {
  const pinchStart$ = recognizable.events$.pipe(
    map(({ event }) => event),
    filter((event): event is PinchEvent => event.type === "pinchStart"),
  )

  const pinchMove$ = recognizable.events$.pipe(
    map(({ event }) => event),
    filter((event): event is PinchEvent => event.type === "pinchMove"),
  )

  return pinchStart$.pipe(
    switchMap(() => {
      const startScale = reader.zoom.state.currentScale

      return pinchMove$.pipe(
        withLatestFrom(reader.viewportState$),
        tap(([event, viewportState]) => {
          /**
           * @important
           * We don't want to trigger zoom gestures if there is a pan navigation
           * in progress. This can happens if the user start panning and then adds
           * another finger triggering a pinch.
           */
          if (viewportState === "busy") return

          // symmetric scaling calculation
          const newScale = startScale * event.scale
          const newScaleCappedAtZoomMaxScale = Math.min(
            newScale,
            settingsManager.values.zoomMaxScale,
          )

          if (!reader.zoom.state.isZooming) {
            // A zoomMaxScale of 1 or less leaves nothing to zoom in to
            if (event.scale > 1 && newScaleCappedAtZoomMaxScale > 1) {
              reader.zoom.enter({
                animate: false,
                scale: newScaleCappedAtZoomMaxScale,
              })
            }

            return
          }

          if (newScale < 1) {
            reader.zoom.exit()
          } else {
            reader.zoom.scaleAt(newScaleCappedAtZoomMaxScale, {
              constrain: "within-viewport",
            })
          }
        }),
        map(([event]) => ({
          type: "pinch" as const,
          gestureEvent: event,
        })),
      )
    }),
  )
}
