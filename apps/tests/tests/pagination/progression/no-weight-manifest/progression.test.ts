import { expect, test } from "@playwright/test"

test.describe("Given undefined progression weight", () => {
  test("should set progression based on number of items", async ({ page }) => {
    await page.setViewportSize({
      width: 300,
      height: 400,
    })

    await page.goto(
      "http://localhost:3333/tests/pagination/progression/no-weight-manifest/index.html",
    )

    await expect(page.locator('text="progression: 0.5"')).toBeVisible()

    await page.keyboard.press("ArrowRight")

    await expect(page.locator('text="progression: 1"')).toBeVisible()
  })
})
