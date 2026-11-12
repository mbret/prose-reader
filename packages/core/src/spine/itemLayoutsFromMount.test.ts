// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import {
  createPrePaginatedManifest,
  createTestReader,
  installReaderTestEnvironment,
  mountTestReader,
  settledOn,
} from "../tests/readerHarness"

installReaderTestEnvironment()

describe("Given a reader of pre-paginated items, from mount to settled", () => {
  it("lays out once every item whose load never started, and lays out again after its load every item that loaded", async () => {
    const numberOfItems = 20
    const reader = createTestReader({
      manifest: createPrePaginatedManifest({
        pageSpreads: Array.from({ length: numberOfItems }, () => undefined),
      }),
    })
    const layoutsOfItemIndex = Array.from({ length: numberOfItems }, () => 0)
    const loadedItemIndexes = new Set<number>()

    reader.hookManager.register("item.onBeforeLayout", ({ item }) => {
      layoutsOfItemIndex[item.index] = (layoutsOfItemIndex[item.index] ?? 0) + 1
    })
    reader.spineItemsManager.items.forEach((item) => {
      item.watch("loadStatus").subscribe((loadStatus) => {
        if (loadStatus !== "idle") loadedItemIndexes.add(item.index)
      })
    })

    mountTestReader(reader)
    await settledOn(reader)

    // Preconditions: some items loaded, and some did not.
    expect(loadedItemIndexes.size, "the items that loaded").toBeGreaterThan(0)
    expect(loadedItemIndexes.size, "the items that loaded").toBeLessThan(
      numberOfItems,
    )

    /**
     * A load changes its item only: the items after it are where the layout
     * of the reader put them, so nothing lays them out again.
     */
    const layoutsOfItemsNeverLoaded = layoutsOfItemIndex
      .map((layouts, index) => ({ index, layouts }))
      .filter(({ index }) => !loadedItemIndexes.has(index))

    expect(
      layoutsOfItemsNeverLoaded.filter(({ layouts }) => layouts !== 1),
      "the items never loaded, laid out other than once",
    ).toEqual([])

    expect(
      [...loadedItemIndexes].filter(
        (index) => !reader.spineItemsManager.get(index)?.value.isReady,
      ),
      "the items loaded, not laid out since",
    ).toEqual([])
  })
})
