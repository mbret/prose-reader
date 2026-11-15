import { expect, type Page } from "@playwright/test"
import { holdPageClockDuring } from "./clock"

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
 * event, so the time between two steps is part of the gesture.
 * `timeBetweenSteps` gives it in milliseconds: one time for every gap, or
 * one per gap, as many as the steps less one. It is a frame by default. The
 * fingers lift at the time of the last step, as in a flick.
 *
 * On a busy runner, the steps would land further apart than asked, and the
 * move before the last could fall out of the 100ms over which gesturx reads
 * a swipe's speed. So the gesture plays with the page's clock held, which
 * moves only by the time between steps, and only once the page has taken the
 * step before: the browser hands a move to the page at its next frame, after
 * the command that sent it returns. The page reads the times given here, on
 * any runner. Install the page's clock before the page loads (see
 * `holdPageClockDuring`).
 *
 * The touches have to land on the page's own document: a book's frame has a
 * document of its own, whose pointer events the wait does not see.
 */
export const playTouchGesture = async (
  page: Page,
  {
    steps,
    timeBetweenSteps = 16,
  }: {
    steps: TouchPoint[][]
    timeBetweenSteps?: number | number[]
  },
) => {
  const gaps =
    typeof timeBetweenSteps === "number"
      ? Array<number>(Math.max(0, steps.length - 1)).fill(timeBetweenSteps)
      : timeBetweenSteps

  if (gaps.length !== steps.length - 1) {
    throw new Error(
      `${steps.length} steps have ${steps.length - 1} gaps, not ${gaps.length}`,
    )
  }

  const readTouchPointerEventsTaken = await countTouchPointerEventsTaken(page)
  const session = await page.context().newCDPSession(page)
  let touchPointerEventsSent = 0

  /**
   * Sends one touch event, one pointer event per finger, and waits for the
   * page to take them. A cancelled pointer gets no more events, which ends
   * the wait as well: the spec then reads the cancel.
   */
  const sendTouchAndWaitForThePage = async (
    type: "touchStart" | "touchMove" | "touchEnd",
    touchPoints: TouchPoint[],
    fingers: number,
  ) => {
    await session.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: touchPoints.map((point, id) => ({ ...point, id })),
    })

    touchPointerEventsSent += fingers

    await expect
      .poll(
        async () => {
          const { taken, isCancelled } = await readTouchPointerEventsTaken()

          return isCancelled || taken >= touchPointerEventsSent
        },
        { message: "the page takes each touch before the clock moves on" },
      )
      .toBe(true)
  }

  try {
    await holdPageClockDuring(page, async () => {
      for (const [index, points] of steps.entries()) {
        // Also for a gap of 0: it runs the timers already due, such as the
        // one that starts a pan once a move passes its threshold.
        if (index > 0) await page.clock.runFor(gaps[index - 1] ?? 0)

        await sendTouchAndWaitForThePage(
          index === 0 ? "touchStart" : "touchMove",
          points,
          points.length,
        )
      }

      await sendTouchAndWaitForThePage(
        "touchEnd",
        [],
        steps[steps.length - 1]?.length ?? 0,
      )
    })
  } finally {
    await session.detach()
  }
}

/**
 * Starts counting the touch pointer events of the page's own document, and
 * returns a function that reads how many it took, and whether a pointer was
 * cancelled. A book's frames have documents of their own, which it does not
 * count.
 */
const countTouchPointerEventsTaken = async (page: Page) => {
  await page.evaluate(() => {
    const touchPointerEventsTaken = { taken: 0, isCancelled: false }

    Object.assign(window, { touchPointerEventsTaken })

    for (const type of ["pointerdown", "pointermove", "pointerup"]) {
      document.addEventListener(
        type,
        (event) => {
          if (event instanceof PointerEvent && event.pointerType === "touch")
            touchPointerEventsTaken.taken++
        },
        true,
      )
    }

    document.addEventListener(
      "pointercancel",
      () => {
        touchPointerEventsTaken.isCancelled = true
      },
      true,
    )
  })

  return () =>
    page.evaluate(
      () =>
        // The page's window is untyped: the function above sets the counter.
        (
          window as unknown as {
            touchPointerEventsTaken: { taken: number; isCancelled: boolean }
          }
        ).touchPointerEventsTaken,
    )
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
