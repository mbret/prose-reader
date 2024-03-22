import { Reader } from "@prose-reader/core"
import { merge, Observable, share, takeUntil, tap } from "rxjs"
import { createPanHandler, PanEvent } from "./createPanHandler"
import { createContainerEvents } from "./createContainerEvents"
import { createTapHandler, TapEvent } from "./createTapHandler"
import { createPinchHandler, PinchEvent } from "./createPinchHandler"

// eslint-disable-next-line @typescript-eslint/ban-types
type Options = {}

export type HammerGestureEnhancerOutput = {
  hammerGesture: {
    events$: Observable<PanEvent | TapEvent | PinchEvent>
  }
}

export const hammerGestureEnhancer =
  <InheritOptions, InheritOutput extends Reader>(next: (options: InheritOptions) => InheritOutput) =>
  (
    options: InheritOptions & {
      hammerGesture?: Options
    },
  ): InheritOutput & HammerGestureEnhancerOutput => {
    const reader = next(options)

    const destroy = () => {
      reader.destroy()
    }

    const containerEvents = createContainerEvents(reader)

    const { pinchEvent$ } = createPinchHandler(reader, containerEvents)
    const { dragEvent$, isDragging$ } = createPanHandler(reader, containerEvents)
    const { doubleTapEvent$, singleTapEvent$ } = createTapHandler({ ...containerEvents, dragEvent$, isDragging$ }, reader)

    reader.context.containerElement$
      .pipe(
        tap((container) => {
          /**
           * @see https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action#none
           * - allow pointer events to works with chrome dev tool mobile view
           */
          container.style.touchAction = `none`
        }),
        takeUntil(reader.$.destroy$),
      )
      .subscribe()

    const events$ = merge(pinchEvent$, dragEvent$, doubleTapEvent$, singleTapEvent$).pipe(share())

    return {
      ...reader,
      destroy,
      hammerGesture: {
        events$,
      },
    }
  }
