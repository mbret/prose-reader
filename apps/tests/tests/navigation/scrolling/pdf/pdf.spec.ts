import { expect, test } from "@playwright/test"
import { goToNextSpineItem, waitForSpineItemReady } from "../../../utils"
import { waitForSettled } from "../../../utils/pagination"
import { getReader } from "../../../utils/reader"

test("should navigate to second page and back to first page", async ({
  page,
}) => {
  await page.setViewportSize({
    width: 300,
    height: 400,
  })

  await page.goto(
    "http://localhost:3333/tests/navigation/scrolling/pdf/index.html",
  )

  await waitForSpineItemReady(page, [0])

  await goToNextSpineItem({ page })
  await waitForSettled(page)

  await expect(page).toHaveScreenshot({ maxDiffPixelRatio: 0.01 })

  await (await getReader(page)).evaluate((reader) => {
    reader.navigation.goToTopSpineItem()
  })
  await waitForSettled(page)

  await expect(page).toHaveScreenshot({ maxDiffPixelRatio: 0.01 })
})

test("should restore to second page with CFI", async ({ page }) => {
  await page.setViewportSize({
    width: 300,
    height: 400,
  })

  await page.goto(
    `http://localhost:3333/tests/navigation/scrolling/pdf/index.html?cfi=${encodeURIComponent("epubcfi(/6/4!)")}`,
  )

  await waitForSpineItemReady(page, [0])

  await expect(page).toHaveScreenshot({ maxDiffPixelRatio: 0.01 })
})

test("should restore to first page with CFI", async ({ page }) => {
  await page.setViewportSize({
    width: 300,
    height: 400,
  })

  await page.goto(
    `http://localhost:3333/tests/navigation/scrolling/pdf/index.html?cfi=${encodeURIComponent("epubcfi(/6/2!)")}`,
  )

  await waitForSpineItemReady(page, [0])

  await expect(page).toHaveScreenshot({ maxDiffPixelRatio: 0.01 })
})
