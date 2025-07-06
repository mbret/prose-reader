import type { HookManager, Reader } from "@prose-reader/core"
import type { PanRecognizer } from "gesturx"
import { EMPTY, map, switchMap, tap } from "rxjs"
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

      return recognizer.events$.pipe(
        tap((event) => {
          if (reader.zoom.state.isZooming && reader.zoom.state.currentScale > 1)
            return

          if (event.type === `panStart`) {
            reader?.navigation.moveTo({ x: 0, y: 0 }, { start: true })
          }

          if (event.type === `panMove`) {
            reader?.navigation.moveTo({ x: event.deltaX, y: event.deltaY })
          }

          if (event.type === `panEnd`) {
            reader?.navigation.moveTo(
              { x: event.deltaX, y: event.deltaY },
              { final: true },
            )
          }
        }),
        map((event) => ({ event, handled: true })),
      )
    }),
  )

  return gestures$
}
