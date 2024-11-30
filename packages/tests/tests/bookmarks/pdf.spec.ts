import { test, expect } from "@playwright/test"

test("should be able to mark bookmarks on pdf (no nodes)", async ({ page }) => {
  await page.setViewportSize({
    width: 300,
    height: 400,
  })

  await page.goto("http://localhost:3333/tests/bookmarks/index.html")

  // wait for first item to be ready
  await page.waitForSelector(".prose-spineItem-ready")

  await page.keyboard.press("ArrowRight")

  await page.waitForTimeout(200)

  const markButton = page.locator("#mark")

  // red
  await expect(markButton).toHaveCSS("background-color", "rgb(255, 0, 0)")

  await markButton.click()

  await page.waitForTimeout(200)

  // green
  await expect(markButton).toHaveCSS("background-color", "rgb(0, 128, 0)")

  await page.keyboard.press("ArrowLeft")

  await page.waitForTimeout(200)

  // red
  await expect(markButton).toHaveCSS("background-color", "rgb(255, 0, 0)")
})
