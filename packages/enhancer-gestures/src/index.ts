import { HookManager, type Reader } from "@prose-reader/core"
import {
  PanRecognizer,
  PinchRecognizer,
  Recognizable,
  SwipeRecognizer,
  TapRecognizer,
} from "gesturx"
import { combineLatest, merge, share, takeUntil, tap } from "rxjs"
import { registerPan } from "./gestures/pan"
import { registerPinch } from "./gestures/pinch"
import { registerSwipe } from "./gestures/swipe"
import { registerTaps } from "./gestures/taps/registerTaps"
import { GesturesSettingsManager } from "./SettingsManager"
import type { EnhancerAPI, Hook, InputSettings } from "./types"

export { isPositionInArea } from "./gestures/taps/utils"
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
         * Ideally we want pinch to triggers before pan so we can
         * capture zoom before starting panning.
         */
        posThreshold: 10,
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
        posThreshold: 20,
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
      ],
      disableTextSelection: false,
    })

    const tapGestures$ = registerTaps({
      hookManager,
      reader,
      recognizable,
      settingsManager,
      recognizer: tapRecognizer,
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

    const containerUpdate$ = reader.context.watch(`rootElement`).pipe(
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

    merge(containerUpdate$, watchSettings$, gestures$)
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
