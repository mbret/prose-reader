import { expect, test } from "@playwright/test"
import { expectSpineItemsInViewport } from "../../utils"
import { waitForSettled } from "../../utils/pagination"

/**
 * A comic's pages are images, and a browser lets an image be dragged out of
 * the page: pressed and moved a few pixels, it starts a drag of its own and
 * cancels the pointer for it. The gestures would then never see the pointer
 * move on or be released, so dragging a page would neither pan nor turn it.
 * Firefox does it on every image.
 *
 * The press lands in the page's frame and reaches the gestures through core,
 * which passes the frame's pointer events on to the root element.
 */

const url = "http://localhost:3333/tests/gestures/pan/index.html"
// portrait, so a single page spans the window
const windowSize = { width: 400, height: 600 }
const Y = 300

test.describe("Given a comic, on its first page", () => {
  test("dragging the page to the left with the mouse turns to the next one", async ({
    page,
  }) => {
    await page.setViewportSize(windowSize)
    await page.goto(url)
    await waitForSettled(page)

    // the press lands on the page's image, in its frame
    expect(
      await page.evaluate((y) => document.elementFromPoint(300, y)?.tagName, Y),
    ).toBe("IFRAME")

    // half the window, well past the pan threshold
    await page.mouse.move(300, Y)
    await page.mouse.down()
    await page.mouse.move(100, Y, { steps: 10 })
    await page.mouse.up()

    await expectSpineItemsInViewport({ page, indexes: [1] })
  })
})
