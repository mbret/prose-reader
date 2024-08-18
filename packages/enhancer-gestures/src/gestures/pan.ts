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
  // let initialTargetBodyUserSelectValue: string | undefined = undefined

  const gestures$ = recognizer.events$.pipe(
    withLatestFrom(settingsManager.values$),
    filter(([, { panNavigation }]) => panNavigation === "pan"),
    tap(([event]) => {
      const target = event?.event.target as null | undefined | HTMLElement
      const targetDocument: Document | null | undefined = target?.ownerDocument
      const targetBody = targetDocument?.body
      // const { computedPageTurnDirection } = reader.settings.values

      if (reader.zoom.isZooming) return

      if (event.type === `panStart`) {
        /**
         * We let the user select
         */
        if (event.delay > DELAY_IGNORE_PAN) return

        reader?.navigation.moveTo({ x: 0, y: 0 }, { start: true })

        if (targetBody) {
          // initialTargetBodyUserSelectValue = targetBody.style.userSelect
          // targetBody.style.userSelect = `none`
        }
      }

      if (event.type === `panMove`) {
        reader?.navigation.moveTo({ x: event.deltaX, y: event.deltaY })
      }

      // used to ensure we ignore false positive on firefox
      if (event.type === `panEnd`) {
        reader?.navigation.moveTo({ x: event.deltaX, y: event.deltaY }, { final: true })

        if (targetBody) {
          // targetBody.style.userSelect = initialTargetBodyUserSelectValue ?? ``
        }
      }
    }),
  )

  return gestures$
}
