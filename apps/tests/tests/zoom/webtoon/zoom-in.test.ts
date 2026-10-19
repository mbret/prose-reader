import { expect, test } from "@playwright/test"
import {
  getScrollNavigationMetadata,
  waitForSpineItemReady,
  zoomAt,
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

      await zoomAt({ page, scale: 2 })

      const { scrollLeft, scrollbarWidth, scrollTop } =
        await getScrollNavigationMetadata({ page })

      expect(scrollLeft).toBeGreaterThan(0)
      expect(scrollTop).toBeGreaterThan(0)
      expect(scrollLeft).toBe(pageWidth / 2 - scrollbarWidth)
      expect(scrollTop).toBe(pageHeight / 2)
    })
  })
})
