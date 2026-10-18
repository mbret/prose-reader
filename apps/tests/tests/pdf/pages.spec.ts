import { expect, test } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import { locateSpineItems, waitForSpineItemReady } from "../utils"

/**
 * One spine item per page of the PDF, each rendering its own page. The
 * fixture's page `N` reads "Page N" (generated with PyMuPDF), and it has more
 * than ten pages, so a page's file name (`11.pdf`) ends with another's
 * (`1.pdf`).
 */

const url = "http://localhost:3333/tests/pdf/index.html?file=twelve-pages.pdf"

const goToSpineItem = (page: import("@playwright/test").Page, index: number) =>
  page.evaluate((index) => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader

    reader.navigation.goToSpineItem({ indexOrId: index, animation: false })
  }, index)

const readSpineItemText = async (
  page: import("@playwright/test").Page,
  index: number,
) => {
  const [spineItem] = await locateSpineItems({ page, indexes: [index] })
  const frame = spineItem?.locator("iframe").contentFrame()

  return frame?.locator("body")
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 600 })
  await page.goto(url)
  await waitForSpineItemReady(page, [0])
})

test("each spine item renders its own page, past the tenth", async ({
  page,
}) => {
  for (const pageNumber of [1, 2, 11, 12]) {
    const index = pageNumber - 1

    await goToSpineItem(page, index)
    await waitForSpineItemReady(page, [index])

    const body = await readSpineItemText(page, index)

    await expect(body ?? page.locator("missing")).toContainText(
      new RegExp(`^\\s*Page ${pageNumber}\\s*$`),
    )
  }
})
