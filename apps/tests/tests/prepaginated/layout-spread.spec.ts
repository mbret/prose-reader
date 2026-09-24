import { expect, test } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import { waitForSpineItemReady } from "../utils"
import { navigateAndSettle, waitForReader } from "../utils/pagination"

test.describe("Given a prepaginated book with first page on spread right", () => {
  test.describe("and numberOfAdjacentSpineItemToPreLoad as 0", () => {
    test("should render first document on right page", async ({ page }) => {
      await page.setViewportSize({
        width: 400,
        height: 300,
      })

      await page.goto("http://localhost:3333/tests/prepaginated/index.html")

      await waitForSpineItemReady(page, [0])

      expect(
        await page.screenshot({
          type: "jpeg",
          quality: 100,
        }),
      ).toMatchSnapshot(`page-spread-right.jpg`, {
        maxDiffPixels: 10,
      })
    })

    /**
     * That the layouts stop once the spread has settled is proved in the unit
     * layer, where the test holds the clock: a browser spec can only guess
     * how long to wait for nothing to happen.
     */
    test("should lay out the next spread after navigating right", async ({
      page,
    }) => {
      await page.setViewportSize({
        width: 400,
        height: 300,
      })

      await page.goto("http://localhost:3333/tests/prepaginated/index.html")

      await waitForReader(page)

      await navigateAndSettle(page, () => page.keyboard.press("ArrowRight"))

      const visibleItems = await page.evaluate(() => {
        // @ts-expect-error window.reader is set by this scenario's index.tsx
        const { begin, end } = (window.reader as Reader).pagination.state

        return [begin.spineItemIndex, end.spineItemIndex]
      })

      expect(visibleItems).toEqual([1, 2])

      expect(
        await page.screenshot({
          type: "jpeg",
          quality: 100,
        }),
      ).toMatchSnapshot(`right-navigation-layout.jpg`, { maxDiffPixels: 10 })
    })
  })
})
