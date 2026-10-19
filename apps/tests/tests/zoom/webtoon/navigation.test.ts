import { expect, test } from "@playwright/test"
import {
  getScrollNavigationMetadata,
  navigateToSpineItem,
  waitForSpineItemReady,
  waitForSpineItemUnloaded,
  zoomAt,
} from "../../utils"

const pageWidth = 300
const pageHeight = 400

test.describe("Given a zoom in", () => {
  test.describe("and user is at mid scroll x", () => {
    test.describe("and user navigate to last spine item", () => {
      test("it should keep correct x position after layout / navigation update", async ({
        page,
      }) => {
        await page.setViewportSize({
          width: pageWidth,
          height: pageHeight,
        })

        await page.goto("http://localhost:3333/tests/layout/webtoon/index.html")

        await waitForSpineItemReady(page, [0])

        await zoomAt({ page, scale: 2 })

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
