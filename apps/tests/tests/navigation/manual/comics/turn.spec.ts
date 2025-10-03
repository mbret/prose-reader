import { test } from "@playwright/test"
import type { SpinePosition } from "@prose-reader/core"
import {
  expectSpineItemsInViewport,
  navigateTo,
  turnRight,
  waitForSpineItemReady,
} from "../../../utils"

const parameters = [
  ["odd", { width: 723, height: 671 }],
  ["even", { width: 722, height: 671 }],
] as const

parameters.forEach(([type, { width, height }]) => {
  test.describe(`Given spread book with an ${type} width for the page`, () => {
    test.describe("When the user turns right", () => {
      test("should navigate to the right page", async ({ page }) => {
        await page.setViewportSize({
          width,
          height,
        })

        await page.goto(
          `http://localhost:3333/tests/navigation/manual/comics/index.html`,
        )

        // Wait for both spine items to be ready
        await waitForSpineItemReady(page, [0, 1])

        await turnRight({ page })

        await expectSpineItemsInViewport({
          page,
          indexes: [2, 3],
        })
      })
    })
  })
})

const offsets = [9999999, Infinity]

offsets.forEach((offset) => {
  test.describe(`Given a navigation to the right out of bounds with offset ${offset}`, () => {
    test("should navigate to last page", async ({ page }) => {
      await page.setViewportSize({
        width: 300,
        height: 300,
      })

      await page.goto(
        `http://localhost:3333/tests/navigation/manual/comics/index.html`,
      )

      // Wait for both spine items to be ready
      await waitForSpineItemReady(page, [0, 1])

      await navigateTo({
        page,
        navigation: { position: { x: offset, y: 0 } as SpinePosition },
      })

      await expectSpineItemsInViewport({
        page,
        indexes: [11],
      })
    })
  })
})
