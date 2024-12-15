import { expect, test } from "@playwright/test"
import { Reader } from "@prose-reader/core"

test("should navigate to second page and back to first page", async ({ page }) => {
  await page.setViewportSize({
    width: 300,
    height: 400,
  })

  await page.goto("http://localhost:3333/tests/navigation/scrolling/pdf/index.html")

  // wait for first item to be ready
  await page.waitForSelector(".prose-spineItem-ready")

  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;((window as any).reader as Reader).navigation.goToNextSpineItem()
  })

  await page.waitForTimeout(100)

  await expect(page).toHaveScreenshot()

  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;((window as any).reader as Reader).navigation.goToTopSpineItem()
  })

  await page.waitForTimeout(100)

  await expect(page).toHaveScreenshot()
})

test("should restore to second page after navigating and reload", async ({ page }) => {
  await page.setViewportSize({
    width: 300,
    height: 400,
  })

  await page.goto("http://localhost:3333/tests/navigation/scrolling/pdf/index.html")

  // wait for first item to be ready
  await page.waitForSelector(".prose-spineItem-ready")

  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;((window as any).reader as Reader).navigation.goToNextSpineItem()
  })

  await page.waitForTimeout(100)

  await page.goto("http://localhost:3333/tests/navigation/scrolling/pdf/index.html")

  await page.waitForSelector(".prose-spineItem-ready")

  await expect(page).toHaveScreenshot()
})

test("should restore to first page after navigating back and forth and reload", async ({ page }) => {
  await page.setViewportSize({
    width: 300,
    height: 400,
  })

  await page.goto("http://localhost:3333/tests/navigation/scrolling/pdf/index.html")

  // wait for first item to be ready
  await page.waitForSelector(".prose-spineItem-ready")

  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;((window as any).reader as Reader).navigation.goToNextSpineItem()
  })

  await page.waitForTimeout(100)

  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;((window as any).reader as Reader).navigation.goToTopSpineItem()
  })

  await page.waitForTimeout(100)

  await page.goto("http://localhost:3333/tests/navigation/scrolling/pdf/index.html")

  await page.waitForSelector(".prose-spineItem-ready")

  await expect(page).toHaveScreenshot()
})
