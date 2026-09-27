import { test } from "@playwright/test"
import {
  expectDocumentsLoadedWith,
  expectSpineItemsInViewport,
  waitForSpineItemReady,
} from "../../../utils"
import {
  describeResourceLoading,
  RESOURCE_LOADINGS,
  withResourceLoading,
} from "../../../utils/resourceLoading"

for (const resourceLoading of RESOURCE_LOADINGS) {
  test.describe(`Given a CFI which points to item index 1, ${describeResourceLoading(resourceLoading)}`, () => {
    const parameters = [
      ["odd", { width: 723, height: 671 }],
      ["even", { width: 722, height: 671 }],
    ] as const

    parameters.forEach(([type, { width, height }]) => {
      test.describe(`and given an ${type} window width number`, () => {
        // You can also do it with test.describe() or with multiple tests as long the test name is unique.
        test("should restore to the second page (item 1,2)", async ({
          page,
        }) => {
          await page.setViewportSize({
            width,
            height,
          })

          // The image of item 1's page.
          const cfi = `epubcfi(/6/4!/4/2)`

          await page.goto(
            withResourceLoading(
              `http://localhost:3333/tests/navigation/restoration/rtl-haruko/index.html?cfi=${encodeURIComponent(cfi)}`,
              resourceLoading,
            ),
          )

          // Wait for both spine items to be ready
          await waitForSpineItemReady(page, [1, 2])
          await expectDocumentsLoadedWith(page, resourceLoading)

          await expectSpineItemsInViewport({
            page,
            indexes: [1, 2],
            // On mobile safari for some reason the ratio is not 1 but 0.999 something.
            ratio: 0.999,
          })
        })
      })
    })
  })
}
