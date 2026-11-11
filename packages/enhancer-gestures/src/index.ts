import { HookManager, isDefined, type Reader } from "@prose-reader/core"
import {
  type FailWith,
  PanRecognizer,
  PinchRecognizer,
  Recognizable,
  SwipeRecognizer,
  TapRecognizer,
} from "gesturx"
import {
  distinctUntilChanged,
  filter,
  map,
  merge,
  Observable,
  of,
  share,
  switchMap,
  takeUntil,
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

    const removeStylesheet = reader.utils.injectScopedCSS(packageName, styles)

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

    const failWithTextSelection: FailWith = {
      running$: reader.selection.selection$.pipe(
        map((selection) => selection !== undefined),
        distinctUntilChanged(),
      ),
    }

    const failWithPinchWhenItCancelsPan: FailWith = {
      running$: settingsManager
        .watch(["pinchCancelPan"])
        .pipe(
          switchMap(({ pinchCancelPan }) =>
            pinchCancelPan ? pinchRecognizer.running$ : of(false),
          ),
        ),
    }

    const panRecognizer = new PanRecognizer({
      failWith: [failWithPinchWhenItCancelsPan, failWithTextSelection],
      options: {
        // we want to have some margin to trigger zoom
        posThreshold: 20,
      },
    })

    const tapRecognizer = new TapRecognizer({
      failWith: [panRecognizer],
    })

    const swipeRecognizer = new SwipeRecognizer({
      failWith: [failWithTextSelection],
    })

    const recognizable = new Recognizable({
      recognizers: [
        tapRecognizer,
        panRecognizer,
        swipeRecognizer,
        pinchRecognizer,
      ],
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

    const containerUpdate$ = reader.context.watch(`rootElement`).pipe(
      filter(isDefined),
      switchMap(
        (container) =>
          new Observable(() => {
            recognizable.update({ container })

            return () => {
              recognizable.update({ container: null })
            }
          }),
      ),
    )

    const gestures$ = merge(
      pinchGestures$,
      tapGestures$,
      swipeGestures$,
      panGestures$,
    ).pipe(takeUntil(reader.$.destroy$), share({ resetOnComplete: false }))

    containerUpdate$.pipe(takeUntil(reader.$.destroy$)).subscribe()

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
