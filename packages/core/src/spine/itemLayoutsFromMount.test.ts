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
  it("lays out once every item whose load never started, and again after its load every item that loaded", async () => {
    const numberOfItems = 20
    const reader = createTestReader({
      manifest: createPrePaginatedManifest({
        pageSpreads: Array.from({ length: numberOfItems }, () => undefined),
      }),
    })
    const layoutsOfItemIndex = Array.from({ length: numberOfItems }, () => 0)
    const itemIndexesWhoseLoadStarted = new Set<number>()

    reader.hookManager.register("item.onBeforeLayout", ({ item }) => {
      layoutsOfItemIndex[item.index] = (layoutsOfItemIndex[item.index] ?? 0) + 1
    })
    reader.spineItemsManager.items.forEach((item) => {
      item.watch("loadStatus").subscribe((loadStatus) => {
        if (loadStatus !== "idle") itemIndexesWhoseLoadStarted.add(item.index)
      })
    })

    mountTestReader(reader)
    await settledOn(reader)

    const itemIndexesNeverLoaded = layoutsOfItemIndex
      .map((_, index) => index)
      .filter((index) => !itemIndexesWhoseLoadStarted.has(index))

    /**
     * Precondition: an item whose load never started comes after one whose
     * load did, so a layout of the items after that one would reach it.
     */
    expect(
      Math.max(...itemIndexesNeverLoaded),
      "the last item whose load never started",
    ).toBeGreaterThan(Math.min(...itemIndexesWhoseLoadStarted))

    /**
     * A load changes its item only: the items after it are where the layout
     * of the reader put them, so nothing lays them out again.
     */
    expect(
      itemIndexesNeverLoaded
        .map((index) => ({ index, layouts: layoutsOfItemIndex[index] }))
        .filter(({ layouts }) => layouts !== 1),
      "the items whose load never started, laid out other than once",
    ).toEqual([])

    // A loaded item is ready only once a layout follows its load.
    expect(
      reader.spineItemsManager.items
        .filter(({ value }) => value.loadStatus === "loaded")
        .filter(({ value }) => !value.isReady)
        .map(({ index }) => index),
      "the loaded items not laid out since their load",
    ).toEqual([])
  })
})
