// @vitest-environment jsdom
import type { HookManager, Reader } from "@prose-reader/core"
import type { TapEvent, TapRecognizer } from "gesturx"
import { BehaviorSubject, of, Subject } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import type { GesturesSettingsManager } from "../../SettingsManager"
import type { GestureRecognizable, Hook, OutputSettings } from "../../types"
import { registerTaps } from "./registerTaps"

const CONTAINER_WIDTH = 1000
const CONTAINER_HEIGHT = 800

type RecognizableEvent = {
  event: TapEvent
  recognizer: TapRecognizer
}

const createTapEvent = (
  recognizer: TapRecognizer,
  x: number,
  y: number,
): RecognizableEvent => {
  // Cast: registerTaps only reads `target`, `x`, `y` from the underlying
  // PointerEvent. Constructing a full PointerEvent requires a DOM env which
  // this test deliberately avoids to keep the harness minimal.
  const pointer = {
    x,
    y,
    target: null,
  } as unknown as PointerEvent

  const event: TapEvent = {
    type: "tap",
    taps: 1,
    center: { x, y },
    event: pointer,
    pointers: [pointer],
    delay: 0,
    deltaX: 0,
    deltaY: 0,
    velocityX: 0,
    velocityY: 0,
    startTime: 0,
    deltaPointersAngle: 0,
    pointersAverageDistance: 0,
  }

  return { event, recognizer }
}

const createDefaultSettings = (): OutputSettings => ({
  panNavigation: false,
  pinchCancelPan: true,
  fontScalePinchEnabled: true,
  fontScalePinchThrottleTime: 500,
  fontScaleMaxScale: 5,
  fontScaleMinScale: 0.2,
  zoomMaxScale: Infinity,
  ignore: [],
})

const createHarness = ({
  currentScale,
  isZooming,
}: {
  currentScale: number
  isZooming: boolean
}) => {
  const events$ = new Subject<RecognizableEvent>()
  const values$ = new BehaviorSubject(createDefaultSettings())

  // Cast: only `getBoundingClientRect` is read by the tap implementation.
  const containerElement = {
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      right: CONTAINER_WIDTH,
      bottom: CONTAINER_HEIGHT,
      width: CONTAINER_WIDTH,
      height: CONTAINER_HEIGHT,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  } as unknown as HTMLElement

  // Cast: only truthiness is checked by the tap implementation.
  const spineElement = {} as HTMLElement

  const turnLeftOrTop = vi.fn()
  const turnRightOrBottom = vi.fn()

  const reader = {
    context: {
      watch: () => of(containerElement),
    },
    spine: {
      element$: of(spineElement),
      locator: {
        getSpineItemPagePositionFromSpinePosition: vi.fn(),
      },
    },
    coordinates: {
      getSpinePositionFromClientPosition: () => undefined,
    },
    settings: {
      values: {
        computedPageTurnDirection: "horizontal" as const,
        computedPageTurnMode: "controlled" as const,
      },
    },
    zoom: {
      state: { isZooming, currentScale },
    },
    navigation: {
      turnLeftOrTop,
      turnRightOrBottom,
    },
  }

  // Cast: sentinel object whose only role is reference equality with the
  // `recognizer` argument passed to registerTaps.
  const recognizer = {} as TapRecognizer

  // Cast: registerTaps only calls `execute`, which returns an empty list
  // when no hooks are registered.
  const hookManager = {
    execute: () => [],
  } as unknown as HookManager<Hook>

  const tapResults: Array<{ handled: boolean }> = []

  const subscription = registerTaps({
    // Cast: registerTaps only reads `events$` from the recognizable.
    recognizable: { events$ } as unknown as GestureRecognizable,
    // Cast: registerTaps only touches the minimal reader surface mocked here.
    reader: reader as unknown as Reader,
    // Cast: settings manager is only read for `values$` and `values.ignore`.
    settingsManager: {
      values$,
      get values() {
        return values$.getValue()
      },
    } as unknown as GesturesSettingsManager,
    hookManager,
    recognizer,
  }).subscribe(({ handled }) => {
    tapResults.push({ handled })
  })

  const tap = (x: number, y: number) => {
    events$.next(createTapEvent(recognizer, x, y))
  }

  return {
    tap,
    tapResults,
    turnLeftOrTop,
    turnRightOrBottom,
    subscription,
  }
}

// Container is 1000px wide; calculatePageTurnLinearMargin(1000) ≈ 0.1614,
// so left turn area is x < ~161 and right turn area is x > ~839.
const LEFT_MARGIN_X = 50
const RIGHT_MARGIN_X = 950
const CENTER_X = 500
const Y = 400

describe("registerTaps", () => {
  describe("at default scale (1)", () => {
    it("turns left when tapping the left margin", () => {
      const {
        tap,
        turnLeftOrTop,
        turnRightOrBottom,
        tapResults,
        subscription,
      } = createHarness({ currentScale: 1, isZooming: false })

      tap(LEFT_MARGIN_X, Y)

      subscription.unsubscribe()

      expect(turnLeftOrTop).toHaveBeenCalledTimes(1)
      expect(turnRightOrBottom).not.toHaveBeenCalled()
      expect(tapResults).toEqual([{ handled: true }])
    })

    it("turns right when tapping the right margin", () => {
      const {
        tap,
        turnLeftOrTop,
        turnRightOrBottom,
        tapResults,
        subscription,
      } = createHarness({ currentScale: 1, isZooming: false })

      tap(RIGHT_MARGIN_X, Y)

      subscription.unsubscribe()

      expect(turnRightOrBottom).toHaveBeenCalledTimes(1)
      expect(turnLeftOrTop).not.toHaveBeenCalled()
      expect(tapResults).toEqual([{ handled: true }])
    })

    it("does not navigate when tapping the center", () => {
      const {
        tap,
        turnLeftOrTop,
        turnRightOrBottom,
        tapResults,
        subscription,
      } = createHarness({ currentScale: 1, isZooming: false })

      tap(CENTER_X, Y)

      subscription.unsubscribe()

      expect(turnLeftOrTop).not.toHaveBeenCalled()
      expect(turnRightOrBottom).not.toHaveBeenCalled()
      expect(tapResults).toEqual([{ handled: false }])
    })
  })

  describe("when zoomed in (scale > 1)", () => {
    it("does not navigate when tapping the left margin", () => {
      const {
        tap,
        turnLeftOrTop,
        turnRightOrBottom,
        tapResults,
        subscription,
      } = createHarness({ currentScale: 2, isZooming: true })

      tap(LEFT_MARGIN_X, Y)

      subscription.unsubscribe()

      expect(turnLeftOrTop).not.toHaveBeenCalled()
      expect(turnRightOrBottom).not.toHaveBeenCalled()
      expect(tapResults).toEqual([{ handled: false }])
    })
  })

  /**
   * Regression: thumbnail / overview mode enters zoom state with
   * `currentScale < 1`. Tap-to-navigate must keep working in that state —
   * previously `isZooming` alone gated navigation and broke this case.
   */
  describe("when zoomed out / in thumbnail mode (scale < 1)", () => {
    it("turns left when tapping the left margin", () => {
      const {
        tap,
        turnLeftOrTop,
        turnRightOrBottom,
        tapResults,
        subscription,
      } = createHarness({ currentScale: 0.5, isZooming: true })

      tap(LEFT_MARGIN_X, Y)

      subscription.unsubscribe()

      expect(turnLeftOrTop).toHaveBeenCalledTimes(1)
      expect(turnRightOrBottom).not.toHaveBeenCalled()
      expect(tapResults).toEqual([{ handled: true }])
    })

    it("turns right when tapping the right margin", () => {
      const {
        tap,
        turnLeftOrTop,
        turnRightOrBottom,
        tapResults,
        subscription,
      } = createHarness({ currentScale: 0.5, isZooming: true })

      tap(RIGHT_MARGIN_X, Y)

      subscription.unsubscribe()

      expect(turnRightOrBottom).toHaveBeenCalledTimes(1)
      expect(turnLeftOrTop).not.toHaveBeenCalled()
      expect(tapResults).toEqual([{ handled: true }])
    })
  })
})
