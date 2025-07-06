import { expect, test } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import {
  getScrollNavigationMetadata,
  navigateToSpineItem,
  waitForSpineItemReady,
  waitForSpineItemUnloaded,
} from "../../utils"

const pageWidth = 300
const pageHeight = 400

test.describe("Given a zoom in", () => {
  test.describe("and user is at first item", () => {
    test("x/y should be scaled up by 2 and centered", async ({ page }) => {
      await page.setViewportSize({
        width: pageWidth,
        height: pageHeight,
      })

      await page.goto("http://localhost:3333/tests/zoom/webtoon/index.html")

      await waitForSpineItemReady(page, [0])

      await page.evaluate(() => {
        // @ts-ignore
        const reader = window.reader as Reader
        reader.zoom.enter()
        reader.zoom.scaleAt(2)
      })

      const { scrollLeft, scrollbarWidth, scrollTop } =
        await getScrollNavigationMetadata({ page })

      expect(scrollLeft).toBeGreaterThan(0)
      expect(scrollTop).toBeGreaterThan(0)
      expect(scrollLeft).toBe(pageWidth / 2 - scrollbarWidth)
      expect(scrollTop).toBe(pageHeight / 2)
    })
  })

  test.describe("and user is at mid scroll x", () => {
    test.describe("and user scrolls to last item", () => {
      test("it should keep correct x position after layout / navigation update", async ({
        page,
      }) => {
        await page.setViewportSize({
          width: pageWidth,
          height: pageHeight,
        })

        await page.goto("http://localhost:3333/tests/layout/webtoon/index.html")

        await waitForSpineItemReady(page, [0])

        await page.evaluate(() => {
          // @ts-ignore
          const reader = window.reader as Reader
          reader.zoom.enter()
          reader.zoom.scaleAt(2)
        })

        await navigateToSpineItem({ page, index: 9 })
        await waitForSpineItemReady(page, [9])
        await waitForSpineItemUnloaded(page, [0])

        const { scrollLeft, scrollbarWidth } =
          await getScrollNavigationMetadata({ page })

        expect(scrollLeft).toBe(pageWidth / 2 - scrollbarWidth)
      })
    })
  })
})
