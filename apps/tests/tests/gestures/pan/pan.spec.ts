import { expect, type Page, test } from "@playwright/test"
import { expectSpineItemsInViewport, locateSpineItemFrame } from "../../utils"
import { waitForSettled } from "../../utils/pagination"

/**
 * A comic's pages are images, and a browser lets an image be dragged out of
 * the page: pressed and moved a few pixels, it starts a drag of its own and
 * cancels the pointer for it. The gestures would then never see the pointer
 * move on or be released, so dragging a page would neither pan nor turn it.
 * Every browser does it.
 *
 * The press lands in the page's frame and reaches the gestures through core,
 * which passes the frame's pointer events on to the root element.
 */

const url = "http://localhost:3333/tests/gestures/pan/index.html"
// portrait, so a single page spans the window
const windowSize = { width: 400, height: 600 }
const Y = 300

const openFirstPage = async (page: Page) => {
  await page.setViewportSize(windowSize)
  await page.goto(url)
  await waitForSettled(page)

  // the press lands on the page's image, in its frame
  expect(
    await page.evaluate((y) => document.elementFromPoint(300, y)?.tagName, Y),
  ).toBe("IFRAME")
}

/** Half the window to the left, well past the pan threshold. */
const dragHalfTheWindowLeft = async (page: Page) => {
  await page.mouse.move(300, Y)
  await page.mouse.down()
  await page.mouse.move(100, Y, { steps: 10 })
  await page.mouse.up()
}

test.describe("Given a comic, on its first page", () => {
  test("dragging the page to the left with the mouse turns to the next one", async ({
    page,
  }) => {
    await openFirstPage(page)

    await dragHalfTheWindowLeft(page)

    await expectSpineItemsInViewport({ page, indexes: [1] })
  })

  /**
   * A book can carry scripts of its own. One that stops the drag event on its
   * image must not let the browser's drag through: the enhancer cancels it
   * before any listener of the book's content runs.
   */
  test("the page still turns when the book's own script stops the drag event", async ({
    page,
  }) => {
    await openFirstPage(page)

    const frame = await locateSpineItemFrame(page, 0)
    await frame
      .contentFrame()
      .locator("img")
      .evaluate((image) => {
        image.addEventListener("dragstart", (event) => event.stopPropagation())
      })

    await dragHalfTheWindowLeft(page)

    await expectSpineItemsInViewport({ page, indexes: [1] })
  })
})
