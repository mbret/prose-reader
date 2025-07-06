import type { Reader } from "@prose-reader/core"
import type { PanRecognizer } from "gesturx"
import { filter, switchMap, tap } from "rxjs"

export const registerZoomPan = ({
  reader,
  recognizer,
}: {
  recognizer: PanRecognizer
  reader: Reader
}) => {
  const panStart$ = recognizer.events$.pipe(
    filter((event) => event.type === "panStart"),
  )
  const panMove$ = recognizer.events$.pipe(
    filter((event) => event.type === "panMove"),
  )

  const zoomingPan$ = panStart$.pipe(
    switchMap(() => {
      const startPosition = reader.zoom.state.currentPosition

      return panMove$.pipe(
        tap((panMoveEvent) => {
          if (reader.zoom.state.isZooming && reader.zoom.state.currentScale > 1) {
            reader.zoom.moveAt({
              x: startPosition.x + panMoveEvent.deltaX,
              y: startPosition.y + panMoveEvent.deltaY,
            })
          }
        }),
      )
    }),
  )

  return zoomingPan$
}
