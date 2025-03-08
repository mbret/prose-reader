import { test } from "@playwright/test"
import {
  expectSpineItemsInViewport,
  turnRight,
  waitForSpineItemReady,
} from "../../../utils"

const parameters = [
  ["odd", { width: 723, height: 671 }],
  ["even", { width: 722, height: 671 }],
] as const

parameters.forEach(([type, { width, height }]) => {
  test.describe(`Given spread book with an ${type} width for the page`, () => {
    test.describe("When the user turns right", () => {
      test("should navigate to the right page", async ({ page }) => {
        await page.setViewportSize({
          width,
          height,
        })

        await page.goto(
          `http://localhost:3333/tests/navigation/manual/comics/index.html`,
        )

        // Wait for both spine items to be ready
        await waitForSpineItemReady(page, [0, 1])

        await turnRight({ page })

        await expectSpineItemsInViewport({
          page,
          indexes: [2, 3],
        })
      })
    })
  })
})
