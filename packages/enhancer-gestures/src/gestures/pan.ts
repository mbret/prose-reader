import { HookManager, Reader } from "@prose-reader/core"
import { EMPTY, Subject, switchMap, tap } from "rxjs"
import { GestureEvent, Hook } from "../types"
import { GesturesSettingsManager } from "../SettingsManager"
import { PanRecognizer } from "gesturx"

const DELAY_IGNORE_PAN = 400

export const registerPan = ({
  reader,
  recognizer,
  settingsManager,
}: {
  recognizer: PanRecognizer
  reader: Reader
  hookManager: HookManager<Hook>
  unhandledEvent$: Subject<GestureEvent>
  settingsManager: GesturesSettingsManager
}) => {
  const gestures$ = settingsManager.values$.pipe(
    switchMap(({ panNavigation }) => {
      if (panNavigation !== "pan") return EMPTY

      return recognizer.events$.pipe(
        tap((event) => {
          if (reader.zoom.isZooming) return

          if (event.type === `panStart`) {
            /**
             * We let the user select
             */
            if (event.delay > DELAY_IGNORE_PAN) return

            reader?.navigation.moveTo({ x: 0, y: 0 }, { start: true })
          }

          if (event.type === `panMove`) {
            reader?.navigation.moveTo({ x: event.deltaX, y: event.deltaY })
          }

          if (event.type === `panEnd`) {
            reader?.navigation.moveTo({ x: event.deltaX, y: event.deltaY }, { final: true })
          }
        }),
      )
    }),
  )

  return gestures$
}
