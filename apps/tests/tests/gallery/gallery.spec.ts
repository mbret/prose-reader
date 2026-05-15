import { expect, test } from "@playwright/test"
import { waitForSpineItemReady } from "../utils"

test("should render comic thumbnails in the gallery", async ({ page }) => {
  await page.setViewportSize({
    width: 900,
    height: 720,
  })

  await page.goto("http://localhost:3333/tests/gallery/index.html")

  await waitForSpineItemReady(page, [0])
  await page.getByRole("button", { name: "Open gallery" }).click()

  const gallery = page.locator("#gallery")

  await expect(gallery).toBeVisible()
  await expect(page.locator("[data-gallery-cell]")).toHaveCount(6)
  await expect(page.locator("#gallery [data-gallery-cell] iframe")).toHaveCount(
    6,
  )

  await expect(gallery).toHaveScreenshot("comic-gallery-thumbnails.png", {
    maxDiffPixelRatio: 0.01,
  })
})
