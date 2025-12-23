import { test } from "@playwright/test"
import {
  expectSpineItemsInViewport,
  locateSpineItemFrame,
  waitForSpineItemReady,
} from "../utils"
import { pan } from "../utils/pan"

test.describe("Given PDF", () => {
  test.describe("Given a mouse pan gesture", () => {
    test("navigation to right page works", async ({ page }) => {
      await page.setViewportSize({
        width: 400,
        height: 600,
      })

      await page.goto("http://localhost:3333/tests/pdf/index.html")

      await waitForSpineItemReady(page, [0])

      // Pan left (right to left) to go to the next page
      await page.mouse.move(350, 300)
      await page.mouse.down()
      await page.mouse.move(50, 300, { steps: 10 })
      await page.mouse.up()

      await expectSpineItemsInViewport({
        page,
        indexes: [1],
      })
    })
  })

  test.describe("Given a touch pan gesture on the iframe body", () => {
    /**
     * Mostly touch-action should be disabled on the frame to allow parent component
     * to handle gestures.
     *
     * @todo This does not test properly the touch-action unless to have a real
     * mobile emulation, this test is incomplete and only assert that pointer events
     * works.
     */
    test("navigation to right page works", async ({ page }) => {
      await page.setViewportSize({
        width: 400,
        height: 600,
      })

      await page.goto("http://localhost:3333/tests/pdf/index.html")

      await waitForSpineItemReady(page, [0])

      const firstSpineItemFrame = await locateSpineItemFrame(page, 0)
      const frameBody = firstSpineItemFrame.contentFrame()?.locator("body")

      // Pan left (right to left) to go to the next page using helper
      // dragging -300px on X axis
      await pan(frameBody, -300, 150, 5)

      await expectSpineItemsInViewport({
        page,
        indexes: [1],
      })
    })
  })
})
