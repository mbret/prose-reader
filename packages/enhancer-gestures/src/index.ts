import { HookManager, isDefined, type Reader } from "@prose-reader/core"
import {
  PanRecognizer,
  PinchRecognizer,
  Recognizable,
  SwipeRecognizer,
  TapRecognizer,
} from "gesturx"
import {
  combineLatest,
  filter,
  merge,
  Observable,
  share,
  switchMap,
  takeUntil,
  tap,
} from "rxjs"
import { name as packageName } from "../package.json"
import { registerPan } from "./gestures/pan"
import { registerPinch } from "./gestures/pinch"
import { registerSwipe } from "./gestures/swipe"
import { registerTaps } from "./gestures/taps/registerTaps"
import { preventNativeDrag } from "./preventNativeDrag"
import { GesturesSettingsManager } from "./SettingsManager"
import styles from "./style.css?inline"
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

    const removeStylesheet = reader.utils.injectScopedCSS(
      document,
      packageName,
      styles,
    )

    const settingsManager = new GesturesSettingsManager(gestures, reader)

    preventNativeDrag(reader)

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
      reader,
      recognizer: panRecognizer,
      settingsManager,
    })

    const swipeGestures$ = registerSwipe({
      reader,
      recognizable,
      settingsManager,
    })

    const pinchGestures$ = registerPinch({
      reader,
      recognizer: pinchRecognizer,
      settingsManager,
    })

    /**
     * gesturx sets `touch-action: none` on the container, listens to it until
     * it is given another one, and has no teardown.
     */
    const containerUpdate$ = reader.context.watch(`rootElement`).pipe(
      filter(isDefined),
      switchMap(
        (container) =>
          new Observable(() => {
            const containerTouchAction = container.style.touchAction

            recognizable.update({
              container,
            })

            return () => {
              recognizable.update({
                container: container.ownerDocument.createElement(`div`),
              })

              if (container.style.touchAction === `none`) {
                container.style.touchAction = containerTouchAction
              }
            }
          }),
      ),
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
    ).pipe(takeUntil(reader.$.destroy$), share({ resetOnComplete: false }))

    merge(containerUpdate$, watchSettings$)
      .pipe(takeUntil(reader.$.destroy$))
      .subscribe()

    gestures$.subscribe()

    return {
      ...reader,
      destroy: () => {
        removeStylesheet()
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
