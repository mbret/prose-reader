import { test } from "@playwright/test"
import type { Reader, SpinePosition } from "@prose-reader/core"
import {
  expectSpineItemsInViewport,
  navigateTo,
  waitForSpineItemReady,
} from "../../../utils"

test.describe(`Given vertical controlled book`, () => {
  test.describe("When the user turns bottom", () => {
    test("should navigate to the right page", async ({ page }) => {
      await page.setViewportSize({
        width: 300,
        height: 600,
      })

      await page.goto(
        `http://localhost:3333/tests/navigation/manual/vertical/index.html`,
      )

      // Wait for both spine items to be ready
      await waitForSpineItemReady(page, [0])

      await page.evaluate(() => {
        // @ts-expect-error
        const reader = window.reader as Reader

        reader.navigation.turnRightOrBottom()
      }, [])

      await expectSpineItemsInViewport({
        page,
        indexes: [1],
      })
    })
  })
})

const offsets = [9999999, Infinity]

offsets.forEach((offset) => {
  test.describe(`Given a navigation to the bottom out of bounds with offset ${offset}`, () => {
    test("should navigate to last page", async ({ page }) => {
      await page.setViewportSize({
        width: 300,
        height: 300,
      })

      await page.goto(
        `http://localhost:3333/tests/navigation/manual/vertical/index.html`,
      )

      // Wait for both spine items to be ready
      await waitForSpineItemReady(page, [0, 1])

      await navigateTo({
        page,
        navigation: { position: { x: 0, y: offset } as SpinePosition },
      })

      await expectSpineItemsInViewport({
        page,
        indexes: [11],
      })
    })
  })
})
