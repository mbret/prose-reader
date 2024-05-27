import { Reader } from "@prose-reader/core"
import "hammerjs"
import {
  BehaviorSubject,
  filter,
  fromEvent,
  ignoreElements,
  interval,
  map,
  merge,
  Observable,
  of,
  share,
  switchMap,
  takeUntil,
  throttle,
  withLatestFrom,
} from "rxjs"
import { createTapListener } from "./createTapListener"
import { isDefined } from "reactjrx"
import { createPanMoveListener } from "./createPanMoveListener"
import { createManager } from "./createManager"

type Options = {
  enableFontScalePinch?: boolean
  fontScaleMin?: number
  fontScaleMax?: number
}

function inputIsNotNullOrUndefined<T>(input: null | undefined | T): input is T {
  return input !== null && input !== undefined
}

export const isNotNullOrUndefined = <T>(source$: Observable<null | undefined | T>) =>
  source$.pipe(filter(inputIsNotNullOrUndefined))

export const hammerGestureEnhancer =
  <InheritOptions, InheritOutput extends Reader>(next: (options: InheritOptions) => InheritOutput) =>
  (
    options: InheritOptions & {
      hammerGesture?: {
        managerInstance?: HammerManager
      } & Options
    },
  ): InheritOutput & {
    hammerGesture: {
      setManagerInstance: (managerInstance: HammerManager) => void
      changes$: Observable<{ type: "fontScaleChange"; value: number } | { type: "tap" }>
      hammerManager$: Observable<HammerManager>
    }
  } => {
    const { hammerGesture: { enableFontScalePinch, fontScaleMax = 10, fontScaleMin = 1, managerInstance } = {} } = options
    const userHammerManager$ = new BehaviorSubject<HammerManager | undefined>(managerInstance)
    const reader = next(options)

    const hammerManager$ = userHammerManager$.pipe(
      switchMap((manager) => {
        if (manager) return of(manager)

        return createManager(reader)
      }),
      share()
    )

    const tapListenerEvents$ = hammerManager$.pipe(
      ignoreElements(),
      filter(isDefined),
      switchMap((manager) => merge(createPanMoveListener(reader, manager), createTapListener(reader, manager))),
    )

    const changes$ = merge(
      tapListenerEvents$,
      hammerManager$.pipe(
        isNotNullOrUndefined,
        switchMap((instance) => {
          const pinchStart$ = fromEvent(instance, "pinchstart").pipe(
            map(() => {
              // if (!reader?.zoom.isZooming()) {
              //   reader?.zoom.enter()
              // }

              return undefined
            }),
          )

          const settingsLastPinchStart$ = pinchStart$.pipe(
            withLatestFrom(reader.settings.settings$),
            map(([, settings]) => settings),
          )

          const pinch$ = fromEvent(instance, "pinch").pipe(
            throttle(() => interval(100)),
            withLatestFrom(settingsLastPinchStart$),
            map(([event, { fontScale: fontScaleOnPinchStart }]) => {
              // if (reader?.zoom.isZooming()) {
              //   reader?.zoom.scale(event.scale)
              // } else 
              if (enableFontScalePinch) {
                const value = fontScaleOnPinchStart + (event.scale - 1)
                const newScale = Math.max(fontScaleMin, Math.min(fontScaleMax, value))

                reader.settings.setSettings({
                  fontScale: newScale,
                })

                return {
                  type: "fontScaleChange" as const,
                  value: newScale,
                }
              }

              return undefined
            }),
          )

          const pinchEnd$ = fromEvent(instance, `pinchend`).pipe(
            map(() => {
              // if (reader?.zoom.isZooming()) {
              //   reader?.zoom.setCurrentScaleAsBase()
              //   if (reader?.zoom.isUsingScrollableZoom() && reader?.zoom.getScaleValue() <= 1) {
              //     reader?.zoom.exit()
              //   }
              // }

              return undefined
            }),
          )

          return merge(pinchStart$, pinch$, pinchEnd$)
        }),
        isNotNullOrUndefined,
      ),
    ).pipe(share(), takeUntil(reader.$.destroy$))

    changes$.subscribe()

    const destroy = () => {
      userHammerManager$.complete()
      reader.destroy()
    }

    return {
      ...reader,
      destroy,
      hammerGesture: {
        setManagerInstance: (instance) => userHammerManager$.next(instance),
        changes$,
        hammerManager$,
      },
    }
  }
