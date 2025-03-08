import { test } from "@playwright/test"
import {
  expectSpineItemsInViewport,
  turnLeft,
  waitForSpineItemReady,
} from "../../../utils"

const parameters = [
  ["odd", { width: 323, height: 671 }],
  ["even", { width: 322, height: 671 }],
] as const

parameters.forEach(([type, { width, height }]) => {
  test.describe(`Given single page book with an ${type} width for the page`, () => {
    test.describe("When the user turns left", () => {
      test("should navigate to the left page", async ({ page }) => {
        await page.setViewportSize({
          width,
          height,
        })

        await page.goto(
          `http://localhost:3333/tests/navigation/manual/rtl-haruko/index.html`,
        )

        // Wait for both spine items to be ready
        await waitForSpineItemReady(page, [0])

        await turnLeft({ page })

        await expectSpineItemsInViewport({
          page,
          indexes: [1],
        })
      })
    })
  })
})
