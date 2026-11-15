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
 * gesturx reads a gesture's speed from the page's clock as it takes each
 * event, so the time between two steps, in milliseconds, is part of the
 * gesture: `stepDelays` gives one after each step, or one for every step, and
 * no time passes between the last step and the lift, as in a flick.
 *
 * Each command waits for the page to take its touch, and on a busy runner two
 * steps asked to be 16ms apart have been 190ms apart. The move before the
 * last then falls out of the 100ms over which gesturx reads a swipe's speed,
 * and the swipe is lost. So the page's clock holds still during the gesture
 * and moves only by the step delays: the page reads the times given here, on
 * any runner. Install the page's clock before the page loads, with
 * `page.clock.install()`.
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

  // `pauseAt` refuses a time in the past, and the page's clock moves on while
  // the call travels, so it pauses a second ahead. A spec plays a gesture on
  // an idle reader, so the timers that jump runs are none of the gesture's.
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000))

  for (const [index, points] of steps.entries()) {
    await session.send("Input.dispatchTouchEvent", {
      type: index === 0 ? "touchStart" : "touchMove",
      touchPoints: points.map((point, id) => ({ ...point, id })),
    })

    const delayAfterStep =
      index === lastIndex
        ? 0
        : typeof stepDelays === "number"
          ? stepDelays
          : (stepDelays[index] ?? 0)

    if (delayAfterStep > 0) await page.clock.runFor(delayAfterStep)
  }

  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  })

  await page.clock.resume()
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
