import type { Reader } from "@prose-reader/core"
import type { PanEvent, PanRecognizer } from "gesturx"
import { BehaviorSubject, Subject } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import type { GesturesSettingsManager } from "../SettingsManager"
import type { OutputSettings } from "../types"
import { registerPan } from "./pan"

const createPanEvent = (
  type: PanEvent["type"],
  deltaX: number,
  deltaY: number,
): PanEvent => {
  // Cast: the pan implementation under test never reads PointerEvent-specific fields.
  const event = new Event("pointermove") as PointerEvent

  return {
    type,
    center: { x: 0, y: 0 },
    event,
    pointers: [event],
    delay: 0,
    deltaX,
    deltaY,
    velocityX: 0,
    velocityY: 0,
    startTime: 0,
    deltaPointersAngle: 0,
    pointersAverageDistance: 0,
  }
}

const createDefaultSettings = (
  panNavigation: OutputSettings["panNavigation"],
): OutputSettings => ({
  panNavigation,
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
  panNavigation,
}: {
  currentScale: number
  isZooming: boolean
  panNavigation: OutputSettings["panNavigation"]
}) => {
  const events$ = new Subject<PanEvent>()
  const values$ = new BehaviorSubject(createDefaultSettings(panNavigation))
  const zoomState = {
    isZooming,
    currentScale,
    currentPosition: { x: 0, y: 0 },
  }
  const panNavigatorState = {
    isStarted: false,
    lastDelta: { x: 0, y: 0 },
  }
  const move = vi.fn((position: { x: number; y: number }) => {
    zoomState.currentPosition = position
  })
  const start = vi.fn((delta: { x: number; y: number }) => {
    panNavigatorState.isStarted = true
    panNavigatorState.lastDelta = delta
  })
  const stop = vi.fn(() => {
    panNavigatorState.isStarted = false
  })
  const panMoveTo = vi.fn((delta: { x: number; y: number }) => {
    panNavigatorState.lastDelta = delta
  })

  const reader = {
    zoom: {
      state: zoomState,
      move,
    },
    navigation: {
      panNavigator: {
        value: panNavigatorState,
        start,
        panMoveTo,
        stop,
      },
    },
  }

  const recognizer = {
    events$,
  }

  const settingsManager = {
    values$,
  }

  const panEvents: PanEvent[] = []

  const subscription = registerPan({
    // Cast: registerPan only reads the recognizer events stream in these tests.
    recognizer: recognizer as unknown as PanRecognizer,
    // Cast: registerPan only touches this minimal Reader gesture/zoom surface.
    reader: reader as unknown as Reader,
    // Cast: registerPan does not read hookManager for pan gestures.
    hookManager: undefined as unknown as Parameters<
      typeof registerPan
    >[0]["hookManager"],
    // Cast: registerPan only reads values$ from the settings manager in these tests.
    settingsManager: settingsManager as unknown as GesturesSettingsManager,
  }).subscribe(({ gestureEvent }) => {
    panEvents.push(gestureEvent)
  })

  return {
    events$,
    values$,
    zoomState,
    move,
    panEvents,
    panMoveTo,
    start,
    stop,
    subscription,
  }
}

describe("registerPan", () => {
  it("allows zoom panning when pan navigation is disabled", () => {
    const { events$, move, panEvents, start, subscription } = createHarness({
      currentScale: 2,
      isZooming: true,
      panNavigation: false,
    })

    events$.next(createPanEvent("panStart", 0, 0))
    events$.next(createPanEvent("panMove", 10, 5))

    subscription.unsubscribe()

    expect(move).toHaveBeenCalledWith(
      { x: 10, y: 5 },
      { constrain: "within-viewport" },
    )
    expect(start).not.toHaveBeenCalled()
    expect(panEvents.map(({ type }) => type)).toEqual(["panStart", "panMove"])
  })

  it("does not navigate for disabled pan navigation outside zoom", () => {
    const { events$, move, start, subscription } = createHarness({
      currentScale: 1,
      isZooming: false,
      panNavigation: false,
    })

    events$.next(createPanEvent("panStart", 0, 0))
    events$.next(createPanEvent("panMove", 10, 5))

    subscription.unsubscribe()

    expect(move).not.toHaveBeenCalled()
    expect(start).not.toHaveBeenCalled()
  })
})

/**
 * The pan navigator holds the navigation from `start()` to `stop()`: while it
 * is held, the reader neither restores, paginates nor moves the reading
 * position. A pan that moved the page has to stop it however it ends.
 */
describe("registerPan stopping the pan navigator", () => {
  type Harness = ReturnType<typeof createHarness>

  it.each<[string, (harness: Harness) => void, { x: number; y: number }]>([
    [
      "it ends",
      ({ events$ }) => events$.next(createPanEvent("panEnd", 30, 0)),
      { x: 30, y: 0 },
    ],
    [
      "a gestures setting changes before it ends",
      ({ values$ }) =>
        values$.next({ ...values$.getValue(), fontScaleMaxScale: 4 }),
      { x: 20, y: 0 },
    ],
    [
      "it ends zoomed in",
      ({ events$, zoomState }) => {
        zoomState.isZooming = true
        zoomState.currentScale = 2
        events$.next(createPanEvent("panEnd", 30, 0))
      },
      { x: 20, y: 0 },
    ],
    [
      "its gestures are unsubscribed from, as when the reader is destroyed",
      ({ subscription }) => subscription.unsubscribe(),
      { x: 20, y: 0 },
    ],
  ])("stops it once when %s, where the page was left", (_, end, landing) => {
    const harness = createHarness({
      currentScale: 1,
      isZooming: false,
      panNavigation: "pan",
    })
    const { events$, start, stop } = harness

    events$.next(createPanEvent("panStart", 0, 0))
    events$.next(createPanEvent("panMove", 10, 0))
    events$.next(createPanEvent("panMove", 20, 0))

    expect(start).toHaveBeenCalledTimes(1)

    end(harness)
    // A later end must not stop it again.
    harness.subscription.unsubscribe()

    expect(stop.mock.calls).toEqual([[landing]])
  })

  it("stops nothing for a pan that did not move the page", () => {
    const { events$, stop, subscription } = createHarness({
      currentScale: 2,
      isZooming: true,
      panNavigation: "pan",
    })

    events$.next(createPanEvent("panStart", 0, 0))
    events$.next(createPanEvent("panMove", 10, 5))
    events$.next(createPanEvent("panEnd", 20, 5))
    subscription.unsubscribe()

    expect(stop).not.toHaveBeenCalled()
  })
})
