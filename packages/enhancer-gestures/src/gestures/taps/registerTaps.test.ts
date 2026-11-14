// @vitest-environment jsdom
import { HookManager, type Reader } from "@prose-reader/core"
import type { TapEvent, TapRecognizer } from "gesturx"
import {
  BehaviorSubject,
  config,
  EMPTY,
  map,
  of,
  Subject,
  throwError,
} from "rxjs"
import { afterEach, describe, expect, it, vi } from "vitest"
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
  zoomMaxScale: Infinity,
  ignore: [],
})

const createHarness = ({
  currentScale = 1,
  isZooming = false,
}: {
  currentScale?: number
  isZooming?: boolean
} = {}) => {
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
      watch: () => of(spineElement),
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

  const hookManager = new HookManager<Hook>()

  const tapResults: Array<{ handled: boolean }> = []
  const onTapsError = vi.fn()

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
  }).subscribe({
    next: ({ handled }) => {
      tapResults.push({ handled })
    },
    error: onTapsError,
  })

  const tap = (x: number, y: number) => {
    events$.next(createTapEvent(recognizer, x, y))
  }

  return {
    tap,
    tapResults,
    onTapsError,
    hookManager,
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

/**
 * A `beforeTapGesture` hook can only object to a tap, with a first verdict of
 * `false`. Anything else it does (complete with no verdict, error, or throw as
 * it is called) must neither drop the tap nor stop the taps that follow.
 */
describe("beforeTapGesture", () => {
  const onUnhandledError = config.onUnhandledError

  afterEach(() => {
    config.onUnhandledError = onUnhandledError
    vi.useRealTimers()
  })

  /** Records what the reader reports as recovered, once its timer has run. */
  const recordRecoveredErrors = () => {
    vi.useFakeTimers()
    const recoveredErrors: unknown[] = []
    config.onUnhandledError = (error) => {
      recoveredErrors.push(error)
    }

    return {
      recoveredErrors: () => {
        vi.runAllTimers()

        return recoveredErrors
      },
    }
  }

  it("drops the tap when a hook's first verdict is false", () => {
    const { tap, tapResults, turnRightOrBottom, hookManager, onTapsError } =
      createHarness()

    hookManager.register("beforeTapGesture", ({ event$ }) =>
      event$.pipe(map(() => false)),
    )

    tap(RIGHT_MARGIN_X, Y)

    expect(tapResults).toEqual([])
    expect(turnRightOrBottom).not.toHaveBeenCalled()
    expect(onTapsError).not.toHaveBeenCalled()
  })

  /**
   * A hook that reads a source with `withLatestFrom`, as react-reader's
   * bookmark hook reads the annotation candidates, completes with no verdict
   * while that source has emitted nothing.
   */
  it("goes on with the tap, and with the next ones, when a hook completes with no verdict", () => {
    const { tap, tapResults, turnRightOrBottom, hookManager, onTapsError } =
      createHarness()

    hookManager.register("beforeTapGesture", () => EMPTY)

    tap(RIGHT_MARGIN_X, Y)
    tap(CENTER_X, Y)

    expect(tapResults).toEqual([{ handled: true }, { handled: false }])
    expect(turnRightOrBottom).toHaveBeenCalledTimes(1)
    expect(onTapsError).not.toHaveBeenCalled()
  })

  it("still drops the tap for another hook's veto when one completes with no verdict", () => {
    const { tap, tapResults, hookManager, onTapsError } = createHarness()

    hookManager.register("beforeTapGesture", () => EMPTY)
    hookManager.register("beforeTapGesture", ({ event$ }) =>
      event$.pipe(map(() => false)),
    )

    tap(RIGHT_MARGIN_X, Y)

    expect(tapResults).toEqual([])
    expect(onTapsError).not.toHaveBeenCalled()
  })

  it("goes on with the tap, and with the next ones, when a hook errors, and reports the error", () => {
    const { recoveredErrors } = recordRecoveredErrors()
    const { tap, tapResults, hookManager, onTapsError } = createHarness()
    const hookError = new Error("hook failed")

    hookManager.register("beforeTapGesture", () => throwError(() => hookError))

    tap(RIGHT_MARGIN_X, Y)
    tap(CENTER_X, Y)

    expect(tapResults).toEqual([{ handled: true }, { handled: false }])
    expect(onTapsError).not.toHaveBeenCalled()
    expect(recoveredErrors()).toEqual([hookError, hookError])
  })

  it("still drops the tap for another hook's veto when one errors", () => {
    const { recoveredErrors } = recordRecoveredErrors()
    const { tap, tapResults, hookManager, onTapsError } = createHarness()
    const hookError = new Error("hook failed")

    hookManager.register("beforeTapGesture", () => throwError(() => hookError))
    hookManager.register("beforeTapGesture", ({ event$ }) =>
      event$.pipe(map(() => false)),
    )

    tap(RIGHT_MARGIN_X, Y)

    expect(tapResults).toEqual([])
    expect(onTapsError).not.toHaveBeenCalled()
    expect(recoveredErrors()).toEqual([hookError])
  })

  it("goes on with the tap, and with the next ones, when a hook throws as it is called, and reports the error", () => {
    const { recoveredErrors } = recordRecoveredErrors()
    const { tap, tapResults, hookManager, onTapsError } = createHarness()
    const hookError = new Error("hook failed")

    hookManager.register("beforeTapGesture", () => {
      throw hookError
    })

    tap(RIGHT_MARGIN_X, Y)
    tap(CENTER_X, Y)

    expect(tapResults).toEqual([{ handled: true }, { handled: false }])
    expect(onTapsError).not.toHaveBeenCalled()
    expect(recoveredErrors()).toEqual([hookError, hookError])
  })

  it("still drops the tap for another hook's veto when one throws as it is called", () => {
    const { recoveredErrors } = recordRecoveredErrors()
    const { tap, tapResults, hookManager, onTapsError } = createHarness()
    const hookError = new Error("hook failed")

    hookManager.register("beforeTapGesture", () => {
      throw hookError
    })
    hookManager.register("beforeTapGesture", ({ event$ }) =>
      event$.pipe(map(() => false)),
    )

    tap(RIGHT_MARGIN_X, Y)

    expect(tapResults).toEqual([])
    expect(onTapsError).not.toHaveBeenCalled()
    expect(recoveredErrors()).toEqual([hookError])
  })

  /**
   * Only the first verdict counts: a hook that keeps emitting does not hold
   * the tap, nor turn the page twice.
   */
  it("takes the first verdict of a hook that keeps emitting", () => {
    const { tap, tapResults, turnRightOrBottom, hookManager } = createHarness()
    const verdicts = new BehaviorSubject(true)

    hookManager.register("beforeTapGesture", () => verdicts)

    tap(RIGHT_MARGIN_X, Y)
    verdicts.next(false)
    verdicts.next(true)

    expect(tapResults).toEqual([{ handled: true }])
    expect(turnRightOrBottom).toHaveBeenCalledTimes(1)
  })
})
