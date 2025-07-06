import {
  type HookManager,
  isHtmlElement,
  type Reader,
} from "@prose-reader/core"
import type { PinchEvent } from "gesturx"
import {
  animationFrameScheduler,
  EMPTY,
  filter,
  map,
  merge,
  switchMap,
  takeUntil,
  tap,
  throttleTime,
  withLatestFrom,
} from "rxjs"
import type { GesturesSettingsManager } from "../SettingsManager"
import type { GestureRecognizable, Hook } from "../types"

const isHtmlImageElement = (
  target: EventTarget | null,
): target is HTMLImageElement =>
  isHtmlElement(target) &&
  !!target.ownerDocument.defaultView &&
  target instanceof target.ownerDocument.defaultView.HTMLImageElement

export const registerPinch = ({
  reader,
  recognizable,
  settingsManager,
}: {
  recognizable: GestureRecognizable
  reader: Reader
  hookManager: HookManager<Hook>
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

  const pinchEnd$ = recognizable.events$.pipe(
    map(({ event }) => event),
    filter((event): event is PinchEvent => event.type === "pinchEnd"),
  )

  const shouldStartZoom = (
    target: EventTarget | null,
  ): target is HTMLImageElement =>
    isHtmlImageElement(target) && !reader.zoom.state.isZooming

  return settingsManager.values$.pipe(
    switchMap(({ fontScalePinchEnabled, fontScalePinchThrottleTime }) => {
      const zoomGestures$ = pinchStart$.pipe(
        withLatestFrom(reader.viewportState$),
        switchMap(([event, viewportState]) => {
          const target = event.event.target
          const startScale = reader.zoom.state.currentScale

          if (viewportState === "busy") return EMPTY

          if (shouldStartZoom(target)) {
            reader.zoom.enter({ element: target })
          }

          if (!reader.zoom.state.isZooming) return EMPTY

          return merge(
            pinchMove$.pipe(
              tap((event) => {
                if (reader.zoom.state.isZooming) {
                  const newScale = startScale + (event.scale - 1)

                  if (newScale < 1) {
                    reader.zoom.exit()
                  } else {
                    reader.zoom.scaleAt(newScale)
                  }
                }
              }),
            ),
          )
        }),
      )

      const watchForFontScaleChange$ = !fontScalePinchEnabled
        ? EMPTY
        : pinchStart$.pipe(
            withLatestFrom(reader.viewportState$),
            switchMap(([pinchStartEvent, viewportState]) => {
              if (
                viewportState === "busy" ||
                shouldStartZoom(pinchStartEvent.event.target) ||
                reader.zoom.state.isZooming
              )
                return EMPTY

              const lastFontScaleOnPinchStart = reader.settings.values.fontScale

              return pinchMove$.pipe(
                throttleTime(
                  fontScalePinchThrottleTime,
                  animationFrameScheduler,
                  {
                    trailing: true,
                  },
                ),
                tap((event) => {
                  const newScale = Number.parseFloat(
                    (lastFontScaleOnPinchStart + (event.scale - 1)).toFixed(2),
                  )

                  const newMinMaxedFontScale = Math.max(
                    Math.min(
                      newScale,
                      settingsManager.values.fontScaleMaxScale,
                    ),
                    settingsManager.values.fontScaleMinScale,
                  )

                  reader.settings.update({
                    fontScale: newMinMaxedFontScale,
                  })
                }),
                takeUntil(pinchEnd$),
              )
            }),
          )

      return merge(zoomGestures$, watchForFontScaleChange$).pipe(
        map((event) => ({ event, handled: true })),
      )
    }),
  )
}
