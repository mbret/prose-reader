import { expect, test } from "@playwright/test"
import { expectDocumentsLoadedWith } from "../../../utils"
import { resizeAndSettle } from "../../../utils/pagination"
import {
  describeResourceLoading,
  RESOURCE_LOADINGS,
  withResourceLoading,
} from "../../../utils/resourceLoading"

for (const resourceLoading of RESOURCE_LOADINGS) {
  test.describe(`Given a CFI, ${describeResourceLoading(resourceLoading)}`, () => {
    test("should navigate correct second page", async ({ page }) => {
      await page.setViewportSize({
        width: 536,
        height: 842,
      })

      const cfi = `epubcfi(/6/${(3 + 1) * 2}!/2/4/4[toc]/4/8/4/2/4/2/2/1)`

      await page.goto(
        withResourceLoading(
          `http://localhost:3333/tests/navigation/restoration/epub/index.html?cfi=${encodeURIComponent(cfi)}`,
          resourceLoading,
        ),
      )

      // TOC
      const frameHandle = page.locator(".spineItem:nth-child(4) iframe")
      const frame = frameHandle.contentFrame()

      const textElement = frame?.getByText("About the Book")
      await textElement?.waitFor({ state: "visible" })
      await expectDocumentsLoadedWith(page, resourceLoading)

      await expect(textElement).toBeInViewport({
        ratio: 1,
      })
    })
  })
}

for (const resourceLoading of RESOURCE_LOADINGS) {
  test.describe(`Given CFI in the middle of book, ${describeResourceLoading(resourceLoading)}`, () => {
    test.describe("and the window is shrunked", () => {
      /**
       * @note This test was asserting a bug where I forgot to "reset" the last known dimensions
       * of the spine item when its not loaded. Going into smaller pageSize, the same spineIte was returning
       * undefined dims and we were using the same previous one (for bigger pageSize). Resulting in an invalid
       * spine item width for the given pageSize. The spine item layout was messed up and calculation were wrong
       * for locators.
       */
      test("should restore navigation back to the same page", async ({
        page,
      }) => {
        await page.setViewportSize({
          width: 690,
          height: 1294,
        })

        // safari books online chapter
        const cfi = `epubcfi(/6/${(6 + 1) * 2}!/2/4/2/2[I_sect1_d1e191]/1)`

        await page.goto(
          withResourceLoading(
            `http://localhost:3333/tests/navigation/restoration/epub/index.html?cfi=${encodeURIComponent(cfi)}`,
            resourceLoading,
          ),
        )

        const frameHandle = page.locator(".spineItem:nth-child(7) iframe")
        const frame = frameHandle.contentFrame()
        const textElement = frame?.getByText("Safari® Books Online")

        await textElement?.waitFor({ state: "visible" })
        await expectDocumentsLoadedWith(page, resourceLoading)

        await expect(textElement).toBeInViewport({
          ratio: 1,
        })

        // these sizes are chosen mostly because they are not even.
        await resizeAndSettle(page, {
          width: 375,
          height: 667,
        })

        // Restoration is a navigation of its own, so the assertion polls.
        await expect(textElement).toBeInViewport({
          ratio: 1,
        })
      })
    })
  })
}
