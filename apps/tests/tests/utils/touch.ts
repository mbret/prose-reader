import type { Page } from "@playwright/test"

export type TouchPoint = { x: number; y: number }

/**
 * The points of one finger moving in a straight line from `from` to `to`, in
 * `count` equal steps, `from` included.
 */
export const touchPath = (from: TouchPoint, to: TouchPoint, count: number) =>
  Array.from({ length: count + 1 }, (_, step) => ({
    x: from.x + ((to.x - from.x) * step) / count,
    y: from.y + ((to.y - from.y) * step) / count,
  }))

/**
 * Plays a gesture on the touch screen. Each step holds one point per finger:
 * the first step presses them, and they lift with the last one.
 *
 * The touches go through the Chrome DevTools Protocol, so the browser handles
 * them as it does a real touch screen: it hit-tests them, applies
 * `touch-action`, and fires each finger's pointer events. Playwright has no
 * other way to press several fingers, so this runs on Chromium only.
 *
 * gesturx reads a gesture's speed from the time between its events, so the
 * time waited between two steps, in milliseconds, is part of the gesture:
 * `stepDelays` gives one after each step, or one for every step, and no time
 * passes between the last step and the lift. The times are real: the page
 * never sees the protocol's `timestamp`, so a busy runner makes them longer.
 */
export const playTouchGesture = async (
  page: Page,
  {
    steps,
    stepDelays = 0,
  }: {
    steps: TouchPoint[][]
    stepDelays?: number | number[]
  },
) => {
  const session = await page.context().newCDPSession(page)
  const lastIndex = steps.length - 1

  for (const [index, points] of steps.entries()) {
    const touch = session.send("Input.dispatchTouchEvent", {
      type: index === 0 ? "touchStart" : "touchMove",
      touchPoints: points.map((point, id) => ({ ...point, id })),
    })

    if (index === lastIndex) {
      // Sent with the last move, the lift follows it at once, as in a flick.
      // gesturx takes a finger that stays still for 40ms before it lifts as
      // stopped, and a busy runner can take that long between two commands.
      await Promise.all([
        touch,
        session.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        }),
      ])
    } else {
      await touch

      const delayAfterStep =
        typeof stepDelays === "number" ? stepDelays : (stepDelays[index] ?? 0)

      if (delayAfterStep > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayAfterStep))
      }
    }
  }

  await session.detach()
}

/**
 * The fingers of `paths` moving together, one point of each path per step.
 * The paths must have as many points as each other.
 */
export const touchSteps = (...paths: TouchPoint[][]) =>
  Array.from(
    { length: Math.max(0, ...paths.map((path) => path.length)) },
    (_, step) =>
      paths.map((path) => {
        const point = path[step]

        if (!point) throw new Error("the fingers' paths differ in length")

        return point
      }),
  )

/**
 * Starts counting the `pointercancel` events of the page's own document, and
 * returns a function that reads the count. A book's frames have documents of
 * their own, which it does not count.
 */
export const countPointerCancels = async (page: Page) => {
  await page.evaluate(() => {
    const pointerCancelCounter = { count: 0 }

    Object.assign(window, { pointerCancelCounter })
    document.addEventListener(
      "pointercancel",
      () => {
        pointerCancelCounter.count++
      },
      true,
    )
  })

  return () =>
    page.evaluate(
      () =>
        // The page's window is untyped: the function above sets the counter.
        (window as unknown as { pointerCancelCounter: { count: number } })
          .pointerCancelCounter.count,
    )
}
