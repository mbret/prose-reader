import { Reader } from "@prose-reader/core"
import { PanRecognizer } from "gesturx"
import { filter, switchMap, tap } from "rxjs"

export const registerZoomPan = ({
  reader,
  recognizer,
}: { recognizer: PanRecognizer; reader: Reader }) => {
  const panStart$ = recognizer.events$.pipe(
    filter((event) => event.type === "panStart"),
  )
  const panMove$ = recognizer.events$.pipe(
    filter((event) => event.type === "panMove"),
  )

  const zoomingPan$ = panStart$.pipe(
    switchMap(() => {
      const startPosition = reader.zoom.currentPosition

      return panMove$.pipe(
        tap((panMoveEvent) => {
          if (reader.zoom.isZooming) {
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
