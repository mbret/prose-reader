import { expect } from "@playwright/test"
import { navigateToSpineItem, waitForSpineItemReady } from "../../utils"
import { getReader } from "../../utils/reader"
import { test } from "../../utils/test"

/**
 * The frame of a spine item is in the page from the start of its load, and
 * blank until its document is in. A blank frame is 0 high in a book that
 * scrolls. A spine item laid out that high shows nothing: once unloaded, the
 * reader never has it in view to load it again.
 */
test.describe("Given a book that scrolls, laid out while a spine item loads with its frame in the page", () => {
  test("should keep a height for that spine item", async ({ page }) => {
    await page.setViewportSize({ width: 300, height: 400 })
    await page.goto("http://localhost:3333/tests/layout/webtoon/index.html")
    await waitForSpineItemReady(page, [0])

    const reader = await getReader(page)

    const layoutsOfLoadingSpineItems = await reader.evaluateHandle((reader) => {
      const layoutsOfLoadingSpineItems: {
        spineItemIndex: number
        height: number
      }[] = []

      reader.hookManager.register("item.onAfterLayout", ({ item }) => {
        const spineItem = reader.spineItemsManager.get(item.index)

        if (
          spineItem?.value.loadStatus === "loading" &&
          spineItem.renderer.getDocumentFrame()?.isConnected
        ) {
          layoutsOfLoadingSpineItems.push({
            spineItemIndex: item.index,
            height: spineItem.layoutInfo.height,
          })
        }
      })

      /**
       * Stands in for anything that lays the book out at that moment, such
       * as a setting that changes. The layout runs before the observer
       * returns, so the frame it reports has loaded nothing yet.
       */
      new MutationObserver((mutations) => {
        const isFrameAdded = mutations.some(({ addedNodes }) =>
          Array.from(addedNodes).some(
            (node) => node instanceof HTMLIFrameElement,
          ),
        )

        if (isFrameAdded) reader.layout({ immediate: true })
      }).observe(document.body, { childList: true, subtree: true })

      return layoutsOfLoadingSpineItems
    })

    const lastSpineItemIndex = 9

    await navigateToSpineItem({ page, index: lastSpineItemIndex })

    await expect
      .poll(async () =>
        (await layoutsOfLoadingSpineItems.jsonValue()).map(
          ({ spineItemIndex }) => spineItemIndex,
        ),
      )
      .toContain(lastSpineItemIndex)

    expect(
      (await layoutsOfLoadingSpineItems.jsonValue()).filter(
        ({ height }) => height <= 0,
      ),
    ).toEqual([])
  })
})
