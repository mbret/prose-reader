import { afterEach, describe, expect, it, vi } from "vitest"
import { holdAnimationFrames } from "../tests/utils"
import { observeResize } from "./rxjs"

/**
 * A resize observer that counts the observers that are observing. It never
 * reports: these tests are about when an observer starts and stops.
 */
const stubResizeObserver = () => {
  const observingObservers = new Set<object>()

  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {
        observingObservers.add(this)
      }

      unobserve() {
        observingObservers.delete(this)
      }

      disconnect() {
        observingObservers.delete(this)
      }
    },
  )

  return { observing: () => observingObservers.size }
}

/**
 * The browser cannot report to an observer started while it reports resizes,
 * and it sends the page an error. A subscriber can come at that moment, such
 * as in a microtask that follows a report. An animation frame never runs
 * during the reports.
 */
describe("Given an element whose resizes are observed", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("starts the observer in the next animation frame, not when the subscriber comes", () => {
    const { observing } = stubResizeObserver()
    const { runAnimationFrame } = holdAnimationFrames(window)

    observeResize(document.createElement("div")).subscribe()

    const observingBeforeFrame = observing()

    runAnimationFrame()

    expect({ observingBeforeFrame, observingAfterFrame: observing() }).toEqual({
      observingBeforeFrame: 0,
      observingAfterFrame: 1,
    })
  })

  it("starts no observer for a subscriber that left before that frame", () => {
    const { observing } = stubResizeObserver()
    const { runAnimationFrame } = holdAnimationFrames(window)

    observeResize(document.createElement("div")).subscribe().unsubscribe()
    runAnimationFrame()

    expect(observing()).toBe(0)
  })

  it("stops the observer when the subscriber leaves", () => {
    const { observing } = stubResizeObserver()
    const { runAnimationFrame } = holdAnimationFrames(window)
    const subscription = observeResize(
      document.createElement("div"),
    ).subscribe()

    runAnimationFrame()
    subscription.unsubscribe()

    expect(observing()).toBe(0)
  })
})
