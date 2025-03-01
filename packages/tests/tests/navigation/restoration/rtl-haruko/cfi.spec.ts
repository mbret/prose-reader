import { test } from "@playwright/test"
import {
  expectSpineItemsInViewport,
  waitForSpineItemReady,
} from "../../../utils"

test.describe("Given a CFI which points to item index 1", () => {
  const parameters = [
    ["odd", { width: 723, height: 671 }],
    ["even", { width: 722, height: 671 }],
  ] as const

  parameters.forEach(([type, { width, height }]) => {
    test.describe(`and given an ${type} window width number`, () => {
      // You can also do it with test.describe() or with multiple tests as long the test name is unique.
      test("should restore to the second page (item 1,2)", async ({ page }) => {
        await page.setViewportSize({
          width,
          height,
        })

        // safari books online chapter
        const cfi = `epubcfi(/2/4/2|[prose~anchor~1]|[prose~offset~0])`

        await page.goto(
          `http://localhost:3333/tests/navigation/restoration/rtl-haruko/index.html?cfi=${encodeURIComponent(cfi)}`,
        )

        // Wait for both spine items to be ready
        await waitForSpineItemReady(page, [1, 2])

        await expectSpineItemsInViewport({
          page,
          indexes: [1, 2],
        })
      })
    })
  })
})
