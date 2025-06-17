import { expect, test } from "@playwright/test"
import { locateSpineItems, waitForSpineItemReady } from "../utils"

test("should render text layer correctly", async ({ page }) => {
  await page.setViewportSize({
    width: 400,
    height: 600,
  })

  await page.goto("http://localhost:3333/tests/pdf/index.html")

  await waitForSpineItemReady(page, [0])

  const [firstPage] = await locateSpineItems({
    page,
    indexes: [0],
  })

  const textLayerFrame = firstPage?.locator("iframe")

  const frame = textLayerFrame?.contentFrame()

  // Find the element containing "Introduction" within the text layer
  const element = frame?.locator('span:has-text("Introduction")')

  if (!element) {
    throw new Error("Element not found")
  }

  const box = await element.boundingBox()

  // Verify the element exists
  await expect(element).toBeVisible()

  expect(box).toMatchObject({
    x: 46.546875,
    y: 399.75,
    width: 65.984375,
    height: 10.453125,
  })
})
