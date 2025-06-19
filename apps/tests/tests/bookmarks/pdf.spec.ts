import { expect, test } from "@playwright/test"
import { waitForSpineItemReady } from "../utils"

const BOOKMARK_ACTIVE_COLOR = "rgb(0, 128, 0)"
const BOOKMARK_INACTIVE_COLOR = "rgb(255, 0, 0)"
const BOOKMARK_BUTTON_ID = "#mark"

test("should be able to mark bookmarks on pdf (no nodes)", async ({ page }) => {
  await page.setViewportSize({
    width: 300,
    height: 400,
  })

  await page.goto("http://localhost:3333/tests/bookmarks/index.html")

  await waitForSpineItemReady(page, [0, 1])

  await page.keyboard.press("ArrowRight")

  await page.waitForTimeout(200)

  const markButton = page.locator(BOOKMARK_BUTTON_ID)

  // red
  await expect(markButton).toHaveCSS(
    "background-color",
    BOOKMARK_INACTIVE_COLOR,
  )

  await markButton.click()

  await page.waitForTimeout(200)

  // green
  await expect(markButton).toHaveCSS("background-color", BOOKMARK_ACTIVE_COLOR)

  await page.keyboard.press("ArrowLeft")

  await page.waitForTimeout(200)

  // red
  await expect(markButton).toHaveCSS(
    "background-color",
    BOOKMARK_INACTIVE_COLOR,
  )
})

test("should be able to bookmark and un-bookmark on pdf", async ({ page }) => {
  await page.setViewportSize({
    width: 300,
    height: 400,
  })

  await page.goto("http://localhost:3333/tests/bookmarks/index.html")

  await waitForSpineItemReady(page, [0])

  const markButton = page.locator(BOOKMARK_BUTTON_ID)
  await markButton.click()

  await expect(markButton).toHaveCSS("background-color", BOOKMARK_ACTIVE_COLOR)

  await markButton.click()

  await expect(markButton).toHaveCSS(
    "background-color",
    BOOKMARK_INACTIVE_COLOR,
  )
})
