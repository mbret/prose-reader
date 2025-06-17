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

  expect({
    x: box?.x.toFixed(0),
    y: box?.y.toFixed(0),
    width: box?.width.toFixed(0),
    height: box?.height.toFixed(0),
  }).toMatchObject({
    x: "47",
    y: "400",
    width: "66",
    height: "10",
  })
})
