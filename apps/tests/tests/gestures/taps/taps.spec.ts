import { expect, type Page, test } from "@playwright/test"
import { waitForSettled } from "../../utils/pagination"

/**
 * A right click is for the context menu. It must not reach the app as a tap,
 * which would toggle its menus, nor turn a page in the margins (#240).
 *
 * The book is reflowable, so every click lands in a spine item's frame and
 * reaches the gestures through core, which passes the frame's pointer events
 * on to the root element. The gesture recognizer only starts a gesture on the
 * primary button, and can only tell a right click from a left one if that copy
 * keeps its button.
 *
 * That a click made no tap is read back through a left click made after it:
 * taps are reported in the order they are made, so once the left click's tap
 * is in, one from the right click would already be there.
 *
 * The recognizer counts presses whose release it has not closed yet as one
 * multi-tap, and reports no tap for two. It closes one on the first task after
 * its release, so the page runs a task between the two clicks. Were it to wait
 * longer, the clicks would merge and the closing tap never come: the spec
 * would time out rather than pass.
 */

const url = "http://localhost:3333/tests/gestures/taps/index.html"
// portrait, so a single page spans the window and every click lands in it
const windowSize = { width: 600, height: 800 }
const Y = 400
const CENTER_X = 300
const LEFT_CLICK_X = 220
// the right page-turn area starts about 18% from the right of a 600px window
const RIGHT_MARGIN_X = 560

type Tap = { x: number; button: number; handled: boolean }

const readTaps = (page: Page) =>
  page.evaluate(
    () =>
      // @ts-expect-error set by this scenario's index.tsx
      window.taps as Tap[],
  )

const setup = async (page: Page) => {
  await page.setViewportSize(windowSize)
  await page.goto(url)
  await waitForSettled(page)

  // Every click lands in the book's content, not on the reader around it.
  for (const x of [CENTER_X, LEFT_CLICK_X, RIGHT_MARGIN_X]) {
    const element = await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.tagName,
      { x, y: Y },
    )

    expect(element, `what is under (${x}, ${Y})`).toBe("IFRAME")
  }
}

/** The taps reported for `action`, closed by a left click in the center. */
const tapsThroughLeftClick = async (
  page: Page,
  action: () => Promise<void>,
) => {
  await action()
  await page.evaluate(() => new Promise<void>((resolve) => setTimeout(resolve)))
  await page.mouse.click(LEFT_CLICK_X, Y)

  await expect
    .poll(() => readTaps(page), {
      message: "the closing left click was never reported as a tap",
    })
    .toContainEqual(expect.objectContaining({ x: LEFT_CLICK_X }))

  return readTaps(page)
}

const leftClickOnly: Tap[] = [{ x: LEFT_CLICK_X, button: 0, handled: false }]

test.describe("Given a reflowable book", () => {
  test("a right click on its content is not a tap", async ({ page }) => {
    await setup(page)

    const taps = await tapsThroughLeftClick(page, () =>
      page.mouse.click(CENTER_X, Y, { button: "right" }),
    )

    expect(taps).toEqual(leftClickOnly)
  })

  test("a right click in the page-turn margin turns no page", async ({
    page,
  }) => {
    await setup(page)

    const taps = await tapsThroughLeftClick(page, () =>
      page.mouse.click(RIGHT_MARGIN_X, Y, { button: "right" }),
    )

    expect(taps).toEqual(leftClickOnly)
  })
})
