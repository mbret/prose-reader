import { expect, type Page, test } from "@playwright/test"
import { locateSpineItemFrame, waitForSpineItemReady } from "../utils"
import { getReader } from "../utils/reader"

/**
 * One spine item per page of the PDF, each rendering its own page. The
 * fixture's page `N` reads "Page N" (generated with PyMuPDF), and it has more
 * than ten pages, so a page's file name (`11.pdf`) ends with another's
 * (`1.pdf`).
 */

const url = "http://localhost:3333/tests/pdf/index.html?file=twelve-pages.pdf"

const goToSpineItem = async (page: Page, index: number) =>
  (await getReader(page)).evaluate((reader, indexOrId) => {
    reader.navigation.goToSpineItem({ indexOrId, animation: false })
  }, index)

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

    const frame = await locateSpineItemFrame(page, index)

    await expect(frame.contentFrame().locator("body")).toContainText(
      new RegExp(`^\\s*Page ${pageNumber}\\s*$`),
    )
  }
})
