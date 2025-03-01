import { test } from "@playwright/test"
import {
  expectSpineItemsInViewport,
  turnRight,
  waitForSpineItemReady,
} from "../../../utils"

test.describe("Given spread book with an odd width for the page", () => {
  test("should navigate to the right page", async ({ page }) => {
    await page.setViewportSize({
      width: 723, // odd
      height: 671,
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
