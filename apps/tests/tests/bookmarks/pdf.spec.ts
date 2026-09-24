import { expect, test } from "@playwright/test"
import { waitForSpineItemReady } from "../utils"
import { navigateAndSettle } from "../utils/pagination"

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

  const markButton = page.locator(BOOKMARK_BUTTON_ID)

  await navigateAndSettle(page, () => page.keyboard.press("ArrowRight"))

  // The button marks the page it shows, so it has to have caught up with the
  // navigation before it is clicked.
  await expect(markButton).toHaveText("Page 1")
  // red
  await expect(markButton).toHaveCSS(
    "background-color",
    BOOKMARK_INACTIVE_COLOR,
  )

  await markButton.click()

  // green
  await expect(markButton).toHaveCSS("background-color", BOOKMARK_ACTIVE_COLOR)

  await navigateAndSettle(page, () => page.keyboard.press("ArrowLeft"))

  await expect(markButton).toHaveText("Page 0")
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
