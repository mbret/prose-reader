import { HookManager, isHtmlElement, Reader } from "@prose-reader/core"
import {
  EMPTY,
  Subject,
  animationFrameScheduler,
  filter,
  merge,
  switchMap,
  takeUntil,
  tap,
  throttleTime,
  withLatestFrom,
} from "rxjs"
import { GestureEvent, GestureRecognizable, Hook } from "../types"
import { GesturesSettingsManager } from "../SettingsManager"
import { PinchEvent } from "gesturx"

const isHtmlImageElement = (target: EventTarget | null): target is HTMLImageElement =>
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
  unhandledEvent$: Subject<GestureEvent>
  settingsManager: GesturesSettingsManager
}) => {
  const pinchStart$ = recognizable.events$.pipe(filter((event): event is PinchEvent => event.type === "pinchStart"))

  const pinchMove$ = recognizable.events$.pipe(filter((event): event is PinchEvent => event.type === "pinchMove"))

  const pinchEnd$ = recognizable.events$.pipe(filter((event): event is PinchEvent => event.type === "pinchEnd"))

  const shouldStartZoom = (target: EventTarget | null): target is HTMLImageElement =>
    isHtmlImageElement(target) && !reader.zoom.isZooming

  return settingsManager.values$.pipe(
    switchMap(({ fontScalePinchEnabled, fontScalePinchThrottleTime }) => {
      const zoomGestures$ = pinchStart$.pipe(
        withLatestFrom(reader.viewportState$),
        switchMap(([event, viewportState]) => {
          const target = event.event.target
          const startScale = reader.zoom.currentScale

          if (viewportState === "busy") return EMPTY

          if (shouldStartZoom(target)) {
            reader.zoom.enter(target)
          }

          if (!reader.zoom.isZooming) return EMPTY

          return merge(
            pinchMove$.pipe(
              tap((event) => {
                if (reader.zoom.isZooming) {
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
              if (viewportState === "busy" || shouldStartZoom(pinchStartEvent.event.target) || reader.zoom.isZooming)
                return EMPTY

              const lastFontScaleOnPinchStart = reader.settings.values.fontScale

              return pinchMove$.pipe(
                throttleTime(fontScalePinchThrottleTime, animationFrameScheduler, {
                  trailing: true,
                }),
                tap((event) => {
                  reader.settings.update({
                    fontScale: parseFloat((lastFontScaleOnPinchStart + (event.scale - 1)).toFixed(2)),
                  })
                }),
                takeUntil(pinchEnd$),
              )
            }),
          )

      return merge(zoomGestures$, watchForFontScaleChange$)
    }),
  )
}
