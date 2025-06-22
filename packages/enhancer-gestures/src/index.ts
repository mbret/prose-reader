import { HookManager, type Reader } from "@prose-reader/core"
import {
  PanRecognizer,
  PinchRecognizer,
  Recognizable,
  SwipeRecognizer,
  TapRecognizer,
} from "gesturx"
import { combineLatest, merge, share, takeUntil, tap } from "rxjs"
import { GesturesSettingsManager } from "./SettingsManager"
import { registerPan } from "./gestures/pan"
import { registerPinch } from "./gestures/pinch"
import { registerSwipe } from "./gestures/swipe"
import { registerTaps } from "./gestures/taps"
import { registerZoomPan } from "./gestures/zoomPan"
import type { EnhancerAPI, Hook, InputSettings } from "./types"

export * from "./types"

export const gesturesEnhancer =
  <InheritOptions, InheritOutput extends Reader>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (
    options: InheritOptions & {
      gestures?: Partial<InputSettings>
    },
  ): InheritOutput & EnhancerAPI => {
    const { gestures = {}, ...rest } = options
    const reader = next(rest as InheritOptions)

    const settingsManager = new GesturesSettingsManager(gestures, reader)

    const hookManager = new HookManager<Hook>()

    const pinchRecognizer = new PinchRecognizer({
      options: {
        /**
         * @important
         * To be less than pan otherwise it will not fail before it starts
         */
        posThreshold: 20,
      },
    })

    const failWithSelection = {
      start$: reader.selection.selectionStart$,
      end$: reader.selection.selectionEnd$,
    }

    const panRecognizer = new PanRecognizer({
      failWith: [pinchRecognizer, failWithSelection],
      options: {
        // we want to have some margin to trigger zoom
        posThreshold: 30,
      },
    })

    const zoomPanRecognizer = new PanRecognizer({
      options: {
        posThreshold: 1,
      },
    })

    const tapRecognizer = new TapRecognizer({
      failWith: [panRecognizer],
    })

    const swipeRecognizer = new SwipeRecognizer({
      failWith: [failWithSelection],
    })

    const recognizable = new Recognizable({
      recognizers: [
        tapRecognizer,
        panRecognizer,
        swipeRecognizer,
        pinchRecognizer,
        zoomPanRecognizer,
      ],
      disableTextSelection: false,
    })

    const tapGestures$ = registerTaps({
      hookManager,
      reader,
      recognizable,
      settingsManager,
    })

    const panGestures$ = registerPan({
      hookManager,
      reader,
      recognizer: panRecognizer,
      settingsManager,
    })

    const swipeGestures$ = registerSwipe({
      hookManager,
      reader,
      recognizable,
      settingsManager,
    })

    const pinchGestures$ = registerPinch({
      hookManager,
      reader,
      recognizable,
      settingsManager,
    })

    const zoomPanGestures$ = registerZoomPan({
      reader,
      recognizer: zoomPanRecognizer,
    })

    const containerUpdate$ = reader.context.containerElement$.pipe(
      tap((container) => {
        recognizable.update({
          container,
        })
      }),
    )

    const watchSettings$ = combineLatest([
      settingsManager.values$,
      panRecognizer.config$,
    ]).pipe(
      tap(([{ pinchCancelPan }, panRecognizerConfig]) => {
        const pinchAlreadyInFailWith =
          panRecognizerConfig.failWith?.includes(pinchRecognizer)

        if (pinchCancelPan && !pinchAlreadyInFailWith) {
          panRecognizer.update({
            failWith: [
              ...(panRecognizerConfig.failWith ?? []),
              pinchRecognizer,
            ],
          })
        }

        if (!pinchCancelPan && pinchAlreadyInFailWith) {
          panRecognizer.update({
            failWith: panRecognizerConfig.failWith?.filter(
              (recognizer) => recognizer !== pinchRecognizer,
            ),
          })
        }
      }),
    )

    const gestures$ = merge(
      pinchGestures$,
      tapGestures$,
      swipeGestures$,
      panGestures$,
    ).pipe(share())

    merge(containerUpdate$, watchSettings$, zoomPanGestures$, gestures$)
      .pipe(takeUntil(reader.$.destroy$))
      .subscribe()

    return {
      ...reader,
      destroy: () => {
        reader.destroy()
        settingsManager.destroy()
      },
      gestures: {
        settings: settingsManager,
        gestures$,
        hooks: hookManager,
      },
    }
  }
