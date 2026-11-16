// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import {
  createPrePaginatedManifest,
  createTestReader,
  defaultTestViewport,
  installReaderTestEnvironment,
  mountTestReader,
  renderItemsOfSetSizes,
  settledOn,
} from "../tests/readerHarness"

installReaderTestEnvironment()

/**
 * A book of vertical writing, whose pages go down each spine item while the
 * items sit side by side: the first item is three pages tall, the last one
 * page.
 */
const openBookWithTallFirstItem = async () => {
  const { getRenderer, setItemSize } = renderItemsOfSetSizes()

  setItemSize(0, { height: 3 * defaultTestViewport.height })

  const reader = createTestReader({
    manifest: createPrePaginatedManifest(),
    getRenderer,
  })

  for (const item of reader.spineItemsManager.items) {
    vi.spyOn(item, "isUsingVerticalWriting").mockReturnValue(true)
  }

  mountTestReader(reader)
  await settledOn(reader, 0)

  return reader
}

describe("Given a spine item taller than the last one, whose pages go down", () => {
  it("navigates to its last page", async () => {
    const reader = await openBookWithTallFirstItem()
    const { height: pageHeight } = defaultTestViewport

    expect(reader.spineItemsManager.get(0)?.pageGeometry.numberOfPages).toBe(3)

    reader.navigation.goToPageOfSpineItem({
      pageIndex: 2,
      spineItemId: 0,
      animation: false,
    })

    expect(reader.navigation.getNavigation()).toMatchObject({
      position: { x: 0, y: 2 * pageHeight },
      spineItem: 0,
    })
  })
})
