// @vitest-environment jsdom
import type { Reader } from "@prose-reader/core"
import type { PinchEvent } from "gesturx"
import { BehaviorSubject, Subject } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import type { GesturesSettingsManager } from "../SettingsManager"
import type { GestureRecognizable, OutputSettings } from "../types"
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

const createHarness = ({ zoomMaxScale }: { zoomMaxScale: number }) => {
  const events$ = new Subject<{ event: PinchEvent }>()
  const values$ = new BehaviorSubject<OutputSettings>({
    panNavigation: "pan",
    pinchCancelPan: true,
    // Off, so a pinch only drives the zoom
    fontScalePinchEnabled: false,
    fontScalePinchThrottleTime: 500,
    fontScaleMaxScale: 5,
    fontScaleMinScale: 0.2,
    zoomMaxScale,
    ignore: [],
  })
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

  const reader = {
    zoom: { state: zoomState, enter, scaleAt, exit },
    viewportState$: new BehaviorSubject("free"),
  }

  const settingsManager = {
    values$,
    get values() {
      return values$.getValue()
    },
  }

  const subscription = registerPinch({
    // Cast: registerPinch only reads the recognizable's events stream in these tests.
    recognizable: { events$ } as unknown as GestureRecognizable,
    // Cast: registerPinch only touches this minimal Reader zoom surface.
    reader: reader as unknown as Reader,
    // Cast: registerPinch does not read hookManager.
    hookManager: undefined as unknown as Parameters<
      typeof registerPinch
    >[0]["hookManager"],
    // Cast: registerPinch only reads values and values$ from the settings manager.
    settingsManager: settingsManager as unknown as GesturesSettingsManager,
  }).subscribe()

  /** One pinch, from two fingers down to two fingers up, through each scale. */
  const pinch = (...scales: number[]) => {
    events$.next({ event: createPinchEvent("pinchStart", 1) })

    for (const scale of scales) {
      events$.next({ event: createPinchEvent("pinchMove", scale) })
    }

    events$.next({ event: createPinchEvent("pinchEnd", scales.at(-1) ?? 1) })
  }

  return { appliedScales, enter, pinch, subscription, zoomState }
}

describe("registerPinch and zoomMaxScale", () => {
  it("never takes the zoom past zoomMaxScale, from the step that enters it", () => {
    const { appliedScales, pinch, subscription } = createHarness({
      zoomMaxScale: 1.5,
    })

    pinch(3, 3.2, 2, 1.2)
    subscription.unsubscribe()

    expect(appliedScales).not.toEqual([])
    expect(Math.max(...appliedScales)).toBeLessThanOrEqual(1.5)
  })

  it("leaves a pinch of a single step zoomed at zoomMaxScale", () => {
    const { pinch, subscription, zoomState } = createHarness({
      zoomMaxScale: 1.5,
    })

    pinch(3)
    subscription.unsubscribe()

    expect(zoomState).toMatchObject({ isZooming: true, currentScale: 1.5 })
  })

  it("enters the zoom at the scale of a first step under zoomMaxScale", () => {
    const { enter, pinch, subscription } = createHarness({ zoomMaxScale: 3 })

    pinch(1.4)
    subscription.unsubscribe()

    expect(enter).toHaveBeenCalledWith({ animate: false, scale: 1.4 })
  })

  it.each([1, 0.5])(
    "does not zoom in when zoomMaxScale is %s",
    (zoomMaxScale) => {
      const { enter, pinch, subscription, zoomState } = createHarness({
        zoomMaxScale,
      })

      pinch(2, 3)
      subscription.unsubscribe()

      expect(enter).not.toHaveBeenCalled()
      expect(zoomState.isZooming).toBe(false)
    },
  )
})
