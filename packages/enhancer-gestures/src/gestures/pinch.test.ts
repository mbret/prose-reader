// @vitest-environment jsdom
import type { Reader } from "@prose-reader/core"
import type { PinchEvent, PinchRecognizer } from "gesturx"
import { BehaviorSubject, Subject } from "rxjs"
import { afterEach, describe, expect, it, vi } from "vitest"
import { GesturesSettingsManager } from "../SettingsManager"
import type { InputSettings } from "../types"
import { registerPinch } from "./pinch"

const createPinchEvent = (
  type: PinchEvent["type"],
  scale: number,
): PinchEvent => {
  // Cast: the pinch implementation under test never reads PointerEvent-specific fields.
  const event = new Event("pointermove") as PointerEvent

  return {
    type,
    scale,
    distance: 0,
    deltaDistance: 0,
    deltaDistanceScale: 0,
    center: { x: 0, y: 0 },
    event,
    pointers: [event, event],
    delay: 0,
    deltaX: 0,
    deltaY: 0,
    velocityX: 0,
    velocityY: 0,
    startTime: 0,
    deltaPointersAngle: 0,
    pointersAverageDistance: 0,
  }
}

const createHarness = (gesturesSettings: Partial<InputSettings> = {}) => {
  const pinchEvents$ = new Subject<PinchEvent>()
  const viewportState$ = new BehaviorSubject<"free" | "busy">("free")
  const zoomState = {
    isZooming: false,
    currentScale: 1,
    currentPosition: { x: 0, y: 0 },
  }
  /** Every scale the pinch gave the zoom, in order. */
  const appliedScales: number[] = []
  const enter = vi.fn(({ scale }: { animate: boolean; scale: number }) => {
    zoomState.isZooming = true
    zoomState.currentScale = scale
    appliedScales.push(scale)
  })
  const scaleAt = vi.fn((scale: number) => {
    zoomState.currentScale = scale
    appliedScales.push(scale)
  })
  const exit = vi.fn(() => {
    zoomState.isZooming = false
    zoomState.currentScale = 1
  })
  const updateReaderSettings = vi.fn()
  const readerSettingsValues = { computedPageTurnMode: "controlled" }

  // Cast: the pinch and the gestures settings read only this much of the reader, and `settings.update` records any change of setting.
  const reader = {
    zoom: { state: zoomState, enter, scaleAt, exit },
    viewportState$,
    settings: {
      values: readerSettingsValues,
      values$: new BehaviorSubject(readerSettingsValues),
      update: updateReaderSettings,
    },
  } as unknown as Reader

  const settingsManager = new GesturesSettingsManager(gesturesSettings, reader)

  /** What the pinch reports to `gestures$`, in order. */
  const reportedPinchEvents: PinchEvent[] = []

  const subscription = registerPinch({
    reader,
    // Cast: registerPinch only reads the recognizer's events stream.
    recognizer: { events$: pinchEvents$ } as unknown as PinchRecognizer,
    settingsManager,
  }).subscribe(({ gestureEvent }) => {
    reportedPinchEvents.push(gestureEvent)
  })

  let lastScale = 1
  const start = () => {
    lastScale = 1
    pinchEvents$.next(createPinchEvent("pinchStart", 1))
  }
  const move = (scale: number) => {
    lastScale = scale
    pinchEvents$.next(createPinchEvent("pinchMove", scale))
  }
  const end = () => pinchEvents$.next(createPinchEvent("pinchEnd", lastScale))

  /** One pinch, from two fingers down to two fingers up, through each scale. */
  const pinch = (...scales: number[]) => {
    start()
    scales.forEach(move)
    end()
  }

  const tearDownHarness = () => {
    subscription.unsubscribe()
    settingsManager.destroy()
  }

  return {
    appliedScales,
    end,
    enter,
    exit,
    move,
    pinch,
    reportedPinchEvents,
    scaleAt,
    settingsManager,
    start,
    tearDownHarness,
    updateReaderSettings,
    viewportState$,
    zoomState,
  }
}

describe("registerPinch and zoomMaxScale", () => {
  it("never takes the zoom past zoomMaxScale, from the step that enters it", () => {
    const { appliedScales, pinch, tearDownHarness } = createHarness({
      zoomMaxScale: 1.5,
    })

    pinch(3, 3.2, 2, 1.2)
    tearDownHarness()

    expect(appliedScales).not.toEqual([])
    expect(Math.max(...appliedScales)).toBeLessThanOrEqual(1.5)
  })

  it("leaves a pinch of a single step zoomed at zoomMaxScale", () => {
    const { pinch, tearDownHarness, zoomState } = createHarness({
      zoomMaxScale: 1.5,
    })

    pinch(3)
    tearDownHarness()

    expect(zoomState).toMatchObject({ isZooming: true, currentScale: 1.5 })
  })

  it("enters the zoom at the scale of a first step under zoomMaxScale", () => {
    const { enter, pinch, tearDownHarness } = createHarness({
      zoomMaxScale: 3,
    })

    pinch(1.4)
    tearDownHarness()

    expect(enter).toHaveBeenCalledWith({ animate: false, scale: 1.4 })
  })

  it.each([1, 0.5])(
    "does not zoom in when zoomMaxScale is %s",
    (zoomMaxScale) => {
      const { enter, pinch, tearDownHarness, zoomState } = createHarness({
        zoomMaxScale,
      })

      pinch(2, 3)
      tearDownHarness()

      expect(enter).not.toHaveBeenCalled()
      expect(zoomState.isZooming).toBe(false)
    },
  )

  it("caps the moves after a change of zoomMaxScale, in the pinch in progress", () => {
    const {
      appliedScales,
      end,
      move,
      settingsManager,
      start,
      tearDownHarness,
    } = createHarness({ zoomMaxScale: 10 })

    start()
    move(1.5)
    move(2)
    settingsManager.update({ zoomMaxScale: 2.5 })
    move(3)
    move(4)
    end()
    tearDownHarness()

    expect(appliedScales).toEqual([1.5, 2, 2.5, 2.5])
  })
})

describe("registerPinch and the zoom", () => {
  it("exits the zoom when the pinch closes below a scale of 1", () => {
    const { exit, pinch, tearDownHarness, zoomState } = createHarness()

    pinch(2, 0.4)
    tearDownHarness()

    expect(exit).toHaveBeenCalledTimes(1)
    expect(zoomState.isZooming).toBe(false)
  })

  it("leaves the zoom alone while a pan holds the viewport, and still reports the moves", () => {
    const {
      enter,
      exit,
      pinch,
      reportedPinchEvents,
      scaleAt,
      tearDownHarness,
      viewportState$,
    } = createHarness()

    viewportState$.next("busy")
    pinch(2, 0.4)
    tearDownHarness()

    expect(enter).not.toHaveBeenCalled()
    expect(scaleAt).not.toHaveBeenCalled()
    expect(exit).not.toHaveBeenCalled()
    expect(
      reportedPinchEvents
        .filter(({ type }) => type === "pinchMove")
        .map(({ scale }) => scale),
    ).toEqual([2, 0.4])
  })
})

describe("registerPinch with the default gestures settings", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("changes no reader setting, however long the pinch takes", () => {
    vi.useFakeTimers()
    const { enter, end, move, start, tearDownHarness, updateReaderSettings } =
      createHarness()

    start()
    for (const scale of [1.5, 2]) {
      move(scale)
      vi.advanceTimersByTime(1000)
    }
    end()
    vi.runAllTimers()
    tearDownHarness()

    expect(enter).toHaveBeenCalledTimes(1)
    expect(updateReaderSettings).not.toHaveBeenCalled()
  })

  it("reports the pinch's start, each of its moves and its end, once each", () => {
    const { pinch, reportedPinchEvents, tearDownHarness } = createHarness()

    pinch(1.5, 2)
    tearDownHarness()

    expect(reportedPinchEvents.map(({ type, scale }) => [type, scale])).toEqual(
      [
        ["pinchStart", 1],
        ["pinchMove", 1.5],
        ["pinchMove", 2],
        ["pinchEnd", 2],
      ],
    )
  })
})
