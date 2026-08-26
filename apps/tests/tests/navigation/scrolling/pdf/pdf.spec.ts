import { expect, test } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import {
  expectSpineItemsInViewport,
  waitForSpineItemReady,
} from "../../../utils"

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

  await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: TODO
    ;((window as any).reader as Reader).navigation.goToNextSpineItem()
  })

  /**
   * A PDF page is only painted once pdf.js resolves its render task, which the
   * spine item reports through `data-is-ready`. Until then the item still shows
   * the "loading <id>" placeholder, and a screenshot taken against it is stable
   * enough for Playwright to stop retrying and fail. Gate on the item being
   * ready *and* scrolled into view rather than on a fixed delay.
   */
  await waitForSpineItemReady(page, [1])
  await expectSpineItemsInViewport({ page, indexes: [1] })

  await expect(page).toHaveScreenshot({ maxDiffPixelRatio: 0.01 })

  await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: TODO
    ;((window as any).reader as Reader).navigation.goToTopSpineItem()
  })

  await waitForSpineItemReady(page, [0])
  await expectSpineItemsInViewport({ page, indexes: [0] })

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
