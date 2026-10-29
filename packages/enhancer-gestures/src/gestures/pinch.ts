import type { Reader } from "@prose-reader/core"
import type { PinchRecognizer } from "gesturx"
import { filter, map, merge, switchMap, tap, withLatestFrom } from "rxjs"
import type { GesturesSettingsManager } from "../SettingsManager"

export const registerPinch = ({
  reader,
  recognizer,
  settingsManager,
}: {
  reader: Reader
  recognizer: PinchRecognizer
  settingsManager: GesturesSettingsManager
}) => {
  const pinchStart$ = recognizer.events$.pipe(
    filter((event) => event.type === "pinchStart"),
  )
  const pinchMove$ = recognizer.events$.pipe(
    filter((event) => event.type === "pinchMove"),
  )
  const pinchEnd$ = recognizer.events$.pipe(
    filter((event) => event.type === "pinchEnd"),
  )

  const zoomedPinchMoves$ = pinchStart$.pipe(
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

          // `event.scale` counts from the pinch's start, so the zoom follows it from the scale it had then
          const newScale = startScale * event.scale
          const newScaleCappedAtZoomMaxScale = Math.min(
            newScale,
            settingsManager.values.zoomMaxScale,
          )

          if (!reader.zoom.state.isZooming) {
            // Only a pinch that spreads zooms in, and a zoomMaxScale of 1 or less leaves nothing to zoom in to
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
        map(([event]) => event),
      )
    }),
  )

  return merge(pinchStart$, zoomedPinchMoves$, pinchEnd$).pipe(
    map((event) => ({
      type: "pinch" as const,
      gestureEvent: event,
    })),
  )
}
