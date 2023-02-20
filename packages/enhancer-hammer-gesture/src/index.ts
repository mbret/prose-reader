import { Reader } from "@prose-reader/core"
import "hammerjs"
import {
  BehaviorSubject,
  filter,
  fromEvent,
  interval,
  merge,
  Observable,
  switchMap,
  takeUntil,
  tap,
  throttle,
  withLatestFrom,
} from "rxjs"

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
    }
  ): InheritOutput & {
    hammerGesture: {
      setManagerInstance: (managerInstance: HammerManager) => void
    }
  } => {
    const { hammerGesture: { enableFontScalePinch, fontScaleMax = 10, fontScaleMin = 1, managerInstance } = {} } = options
    const manager$ = new BehaviorSubject<HammerManager | undefined>(managerInstance)
    const reader = next(options)

    const destroy = () => {
      manager$.complete()
      reader.destroy()
    }

    manager$
      .pipe(
        isNotNullOrUndefined,
        switchMap((instance) => {
          let initialFontScale = 1

          const pinchStart$ = fromEvent(instance, "pinchstart").pipe(
            withLatestFrom(reader.settings$),
            tap(([, settings]) => {
              initialFontScale = settings.fontScale
              if (!reader?.zoom.isZooming()) {
                reader?.zoom.enter()
              }
            })
          )

          const pinch$ = fromEvent(instance, "pinch").pipe(
            throttle(() => interval(100)),
            tap((event) => {
              if (reader?.zoom.isZooming()) {
                reader?.zoom.scale(event.scale)
              } else if (enableFontScalePinch) {
                const value = initialFontScale + (event.scale - 1)
                reader.setSettings({
                  fontScale: Math.max(fontScaleMin, Math.min(fontScaleMax, value)),
                })
              }
            })
          )

          const pinchEnd$ = fromEvent(instance, `pinchend`).pipe(
            tap(() => {
              if (reader?.zoom.isZooming()) {
                reader?.zoom.setCurrentScaleAsBase()
                if (reader?.zoom.isUsingScrollableZoom() && reader?.zoom.getScaleValue() <= 1) {
                  reader?.zoom.exit()
                }
              }
            })
          )

          return merge(pinchStart$, pinch$, pinchEnd$)
        }),
        takeUntil(reader.$.destroy$)
      )
      .subscribe()

    return {
      ...reader,
      destroy,
      hammerGesture: {
        setManagerInstance: (instance) => manager$.next(instance),
      },
    }
  }
