import { expect, test } from "@playwright/test"
import { locateSpineItems, waitForSpineItemReady } from "../../utils"

test("first spine item should have correct width and height", async ({
  page,
}) => {
  await page.setViewportSize({
    width: 300,
    height: 400,
  })

  await page.goto("http://localhost:3333/tests/layout/webtoon/index.html")

  const spineItems = await locateSpineItems({
    page,
    indexes: [0],
  })

  // biome-ignore lint/style/noNonNullAssertion: TODO
  const spineItem1 = spineItems[0]!

  await spineItem1.waitFor({ state: "visible" })

  const boundingBox = await spineItem1.boundingBox()
  expect(boundingBox).not.toBeNull()
  expect(boundingBox?.width).toBe(300)
  expect(boundingBox?.height).toBe(1306)
})

test.describe("Given a resize down", () => {
  test("spine item should have its width and height adjusted", async ({
    page,
  }) => {
    await page.setViewportSize({
      width: 300,
      height: 400,
    })

    await page.goto("http://localhost:3333/tests/layout/webtoon/index.html")

    await waitForSpineItemReady(page, [0])

    await page.setViewportSize({
      width: 200,
      height: 400,
    })

    const [spineItem] = await locateSpineItems({
      page,
      indexes: [0],
    })

    if (!spineItem) {
      throw new Error("Spine item not found")
    }

    // wait a bit for layout to happen
    await expect(async () => {
      const boundingBox = await spineItem.boundingBox()
      expect(boundingBox?.width).toBe(200)
      expect(boundingBox?.height).toBe(870)
    }).toPass({
      timeout: 10000,
      intervals: [100, 250, 500],
    })
  })
})
