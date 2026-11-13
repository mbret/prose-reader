import { expect } from "@playwright/test"
import { navigateToSpineItem, waitForSpineItemReady } from "../../utils"
import { getReader } from "../../utils/reader"
import { test } from "../../utils/test"

/**
 * A layout of a spine item that ran while its frame was in the page and its
 * document was not: what the page records below.
 */
type LayoutOfLoadingSpineItem = { spineItemIndex: number; height: number }

/**
 * The page's window, as the page functions below fill it. They cast to it,
 * since the window's own type knows none of it.
 */
type ScenarioWindow = {
  layoutsOfLoadingSpineItems: LayoutOfLoadingSpineItem[]
}

/**
 * The frame of a spine item is in the page from the start of its load, and
 * blank until its document is in. A blank frame is 0 high in a book that
 * scrolls. A spine item laid out that high shows nothing: once unloaded, the
 * reader never has it in view to load it again.
 */
test.describe("Given a book that scrolls, laid out while the frame of a spine item is in the page and its document is not", () => {
  test("should keep a height for that spine item, and load it", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 300, height: 400 })
    await page.goto("http://localhost:3333/tests/layout/webtoon/index.html")
    await waitForSpineItemReady(page, [0])

    const reader = await getReader(page)

    await reader.evaluate((reader) => {
      const layoutsOfLoadingSpineItems: LayoutOfLoadingSpineItem[] = []

      Object.assign(window, { layoutsOfLoadingSpineItems })

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
    })

    const lastSpineItemIndex = 9

    await navigateToSpineItem({ page, index: lastSpineItemIndex })

    const readLayoutsOfLoadingSpineItems = () =>
      page.evaluate(
        () => (window as unknown as ScenarioWindow).layoutsOfLoadingSpineItems,
      )

    await expect
      .poll(async () =>
        (await readLayoutsOfLoadingSpineItems()).map(
          ({ spineItemIndex }) => spineItemIndex,
        ),
      )
      .toContain(lastSpineItemIndex)

    expect(
      (await readLayoutsOfLoadingSpineItems()).filter(
        ({ height }) => height <= 0,
      ),
    ).toEqual([])

    await waitForSpineItemReady(page, [lastSpineItemIndex])
  })
})
