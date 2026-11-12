import { expect } from "@playwright/test"
import { waitForSettled } from "../../utils/pagination"
import { test } from "../../utils/test"

/**
 * A touch pans only as far as `touch-action` allows, read from the touched
 * element up to its nearest scroll container. The reader's scroll navigator
 * is one, and scrolls vertically, so the gestures enhancer has to give every
 * element in the reader `touch-action: none`, not only its container.
 * Otherwise the browser takes a vertical drag for a scroll and cancels its
 * pointer, and the gestures lose it.
 *
 * A book's frames carry their own `touch-action`, so the drag starts beside
 * the page: in a landscape window, a comic page leaves the reader's own
 * elements on both sides of it.
 */

const url = "http://localhost:3333/tests/gestures/pan/index.html"
const windowSize = { width: 900, height: 500 }
// right of the page, on the reader's own elements
const X = 850
const START_Y = 150

/**
 * The page's window, as the page functions below fill it. They cast to it,
 * since the window's own type knows none of it.
 */
type ScenarioWindow = { pointerCancels: number }

test.describe("Given a comic in a landscape window", () => {
  test("a vertical touch drag that starts beside the page keeps its pointer", async ({
    page,
    browserName,
    hasTouch,
  }) => {
    test.skip(
      browserName !== "chromium" || !hasTouch,
      "the touch drag goes through the Chrome DevTools Protocol, on a touch profile",
    )

    await page.setViewportSize(windowSize)
    await page.goto(url)
    await waitForSettled(page)

    const startElement = await page.evaluate(
      ({ x, y }) => {
        const element = document.elementFromPoint(x, y)

        return {
          tagName: element?.tagName,
          isInReader: !!element?.closest("[data-prose-reader-container]"),
        }
      },
      { x: X, y: START_Y },
    )

    expect(startElement, "what the drag starts on").toEqual({
      tagName: "DIV",
      isInReader: true,
    })

    await page.evaluate(() => {
      Object.assign(window, { pointerCancels: 0 })
      document.addEventListener(
        "pointercancel",
        () => {
          const scenarioWindow = window as unknown as ScenarioWindow

          scenarioWindow.pointerCancels++
        },
        true,
      )
    })

    const session = await page.context().newCDPSession(page)

    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: X, y: START_Y }],
    })

    for (let step = 1; step <= 10; step++) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: X, y: START_Y + step * 25 }],
      })
    }

    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    })

    expect(
      await page.evaluate(
        () => (window as unknown as ScenarioWindow).pointerCancels,
      ),
    ).toBe(0)
  })
})
