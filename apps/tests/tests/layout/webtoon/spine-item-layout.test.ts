import { expect, test } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import {
  locateSpineItems,
  waitForSpineItemReady,
  waitForSpineItemUnloaded,
} from "../../utils"

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
      timeout: 1500,
      intervals: [100, 300, 400, 500, 600, 700, 900, 1000],
    })
  })
})

test.describe("Given a scroll scroll to bottom", () => {
  test.describe("and first spine item unload", () => {
    test("it should keep its last saved dimensions", async ({ page }) => {
      await page.setViewportSize({
        width: 300,
        height: 400,
      })

      await page.goto("http://localhost:3333/tests/layout/webtoon/index.html")

      await waitForSpineItemReady(page, [0])

      // Scroll to the bottom of the page
      await page.evaluate(() => {
        // @ts-ignore
        ;(window.reader as Reader).navigation.goToSpineItem({ indexOrId: 9 })
      })

      await waitForSpineItemReady(page, [9])
      await waitForSpineItemUnloaded(page, [0])

      // at this point we can assume there has been a full layout and first
      // spine item has been unloaded and re-layout

      const [firstSpineItem] = await locateSpineItems({
        page,
        indexes: [0],
        isReady: false,
      })

      if (!firstSpineItem) {
        throw new Error("First spine item not found")
      }

      const boundingBox = await firstSpineItem.boundingBox()
      expect(boundingBox).not.toBeNull()
      expect(boundingBox?.width).toBe(300)
      expect(boundingBox?.height).toBe(1306)
    })
  })
})
