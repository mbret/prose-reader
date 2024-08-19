import { HookManager, Reader } from "@prose-reader/core"
import { Subject, filter, tap, withLatestFrom } from "rxjs"
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
  const gestures$ = recognizer.events$.pipe(
    withLatestFrom(settingsManager.values$),
    filter(([, { panNavigation }]) => panNavigation === "pan"),
    tap(([event]) => {
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

  return gestures$
}
