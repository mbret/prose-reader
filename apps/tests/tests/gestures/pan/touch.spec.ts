import { expect, type Page } from "@playwright/test"
import { waitForSettled } from "../../utils/pagination"
import { getReader } from "../../utils/reader"
import { test } from "../../utils/test"
import {
  countPointerCancels,
  playTouchGesture,
  touchPath,
  touchSteps,
} from "../../utils/touch"

/**
 * The gestures as a touch screen makes them: the fingers' touches go through
 * the browser, which applies `touch-action` and fires their pointer events,
 * on a page of a comic and on the reader around it. The touch screen is
 * driven through Chromium's DevTools Protocol, so these run on its touch
 * profile only.
 */

const url = "http://localhost:3333/tests/gestures/pan/index.html"
// portrait, so a single page spans the window and every touch lands on it
const portraitWindow = { width: 400, height: 600 }
const Y = 300

const skipWithoutTouchScreen = ({
  browserName,
  hasTouch,
}: {
  browserName: string
  hasTouch: boolean
}) =>
  test.skip(
    browserName !== "chromium" || !hasTouch,
    "the touch screen is driven through the Chrome DevTools Protocol, on a touch profile",
  )

const openFirstPage = async (page: Page, query = "") => {
  await page.setViewportSize(portraitWindow)
  await page.goto(`${url}${query}`)
  await waitForSettled(page)
}

const readBeginSpineItemIndex = async (page: Page) =>
  (await getReader(page)).evaluate(
    (reader) => reader.pagination.state.begin.spineItemIndex,
  )

test.describe("Given a comic on a touch screen, on its first page", () => {
  test("a finger dragged to the left turns to the next page", async ({
    page,
    browserName,
    hasTouch,
  }) => {
    skipWithoutTouchScreen({ browserName, hasTouch })
    await openFirstPage(page)

    await playTouchGesture(page, {
      steps: touchSteps(touchPath({ x: 300, y: Y }, { x: 100, y: Y }, 10)),
      stepDelays: 16,
    })

    await expect.poll(() => readBeginSpineItemIndex(page)).toBe(1)
  })

  test("two fingers spread apart zoom the book, and not the page", async ({
    page,
    browserName,
    hasTouch,
  }) => {
    skipWithoutTouchScreen({ browserName, hasTouch })
    await openFirstPage(page)

    await playTouchGesture(page, {
      steps: touchSteps(
        touchPath({ x: 150, y: Y }, { x: 60, y: Y }, 10),
        touchPath({ x: 250, y: Y }, { x: 340, y: Y }, 10),
      ),
      stepDelays: 16,
    })

    const reader = await getReader(page)

    await expect
      .poll(() => reader.evaluate((reader) => reader.zoom.state.currentScale))
      .toBeGreaterThan(1)
    expect(await page.evaluate(() => window.visualViewport?.scale)).toBe(1)
  })

  test.describe("with swipe navigation", () => {
    test("a quick flick to the left turns to the next page", async ({
      page,
      browserName,
      hasTouch,
    }) => {
      skipWithoutTouchScreen({ browserName, hasTouch })
      await openFirstPage(page, "?panNavigation=swipe")

      // 300px in three steps, a frame apart: still a swipe at 100ms a step,
      // should a runner be slow
      await playTouchGesture(page, {
        steps: touchSteps(touchPath({ x: 350, y: Y }, { x: 50, y: Y }, 3)),
        stepDelays: 16,
      })

      await expect.poll(() => readBeginSpineItemIndex(page)).toBe(1)
    })

    /**
     * gesturx reads a swipe's speed when the finger lifts, over its last
     * 100ms. Over the whole gesture, this one is too slow to swipe: 280px in
     * more than 360ms, under gesturx's 0.9px/ms.
     */
    test("a slow drag that ends in a quick flick turns to the next page", async ({
      page,
      browserName,
      hasTouch,
    }) => {
      skipWithoutTouchScreen({ browserName, hasTouch })
      await openFirstPage(page, "?panNavigation=swipe")

      // 30px in at least 360ms, then 250px in two steps, a frame apart
      const slowPart = touchPath({ x: 300, y: Y }, { x: 270, y: Y }, 6)
      const flick = touchPath({ x: 270, y: Y }, { x: 20, y: Y }, 2).slice(1)

      await playTouchGesture(page, {
        steps: touchSteps([...slowPart, ...flick]),
        stepDelays: [
          ...Array(slowPart.length).fill(60),
          ...Array(flick.length).fill(16),
        ],
      })

      await expect.poll(() => readBeginSpineItemIndex(page)).toBe(1)
    })
  })
})

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
test.describe("Given a comic in a landscape window, on a touch screen", () => {
  const X = 850
  const START_Y = 150

  test("a vertical drag that starts beside the page keeps its pointer", async ({
    page,
    browserName,
    hasTouch,
  }) => {
    skipWithoutTouchScreen({ browserName, hasTouch })
    await page.setViewportSize({ width: 900, height: 500 })
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

    const readPointerCancels = await countPointerCancels(page)

    await playTouchGesture(page, {
      steps: touchSteps(
        touchPath({ x: X, y: START_Y }, { x: X, y: START_Y + 250 }, 10),
      ),
    })

    expect(await readPointerCancels()).toBe(0)
  })
})
