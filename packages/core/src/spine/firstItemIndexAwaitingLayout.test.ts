// @vitest-environment jsdom
import { filter, first, firstValueFrom } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import {
  createPrePaginatedManifest,
  createTestReader,
  installReaderTestEnvironment,
  mountTestReader,
  requestLayoutByUnloadingItem,
  settledOn,
} from "../tests/readerHarness"

installReaderTestEnvironment()

/** Three items of one page each. */
const createThreeItemsTestReader = () =>
  createTestReader({
    manifest: createPrePaginatedManifest({
      pageSpreads: [undefined, undefined, undefined],
    }),
  })

describe("the first item awaiting layout", () => {
  it("is the first item until the reader is first laid out", () => {
    const reader = createThreeItemsTestReader()

    expect(reader.spine.value.firstItemIndexAwaitingLayout).toBe(0)
    expect(reader.spine.isLayoutCurrentFor(0)).toBe(false)
  })

  it("is the item whose load ends, and the first one for a layout of the reader", async () => {
    const reader = createThreeItemsTestReader()

    mountTestReader(reader)
    await settledOn(reader, 0)

    await requestLayoutByUnloadingItem(reader, 2)

    // An item's place depends only on the items before it.
    expect(reader.spine.isLayoutCurrentFor(1)).toBe(true)
    expect(reader.spine.isLayoutCurrentFor(2)).toBe(false)

    // The viewport it measures can change every item.
    reader.layout()

    expect(reader.spine.value.firstItemIndexAwaitingLayout).toBe(0)
  })

  it("keeps the items a completed pass laid out awaiting layout until their pages are published, whatever a later request asks for", async () => {
    const reader = createThreeItemsTestReader()
    const thirdItem = reader.spineItemsManager.get(2)

    if (!thirdItem) throw new Error("item 2 is missing")

    mountTestReader(reader)
    await settledOn(reader, 0)
    await vi.waitFor(() => {
      expect(
        reader.spineItemsManager.items.map(({ value }) => value.loadStatus),
      ).toEqual(["loaded", "loaded", "loaded"])
      expect(reader.spine.value.firstItemIndexAwaitingLayout).toBeUndefined()
    })

    /**
     * Once the pass from the second item completes, its pages take frames to
     * resolve. The third item is released meanwhile, which asks for a layout
     * from the third item and replaces those pages before they are published:
     * the pages still describe the second item as it was before either
     * layout.
     */
    reader.spine.itemsLayout$.pipe(first()).subscribe(() => {
      thirdItem.unload()
    })
    const requestedFromTheThirdItem = firstValueFrom(
      reader.spine.pages.spineLayout.lifecycle$.pipe(
        filter(
          (event) =>
            event.stage === "requested" &&
            event.firstItemIndexAwaitingLayout === 2,
        ),
      ),
    )

    await requestLayoutByUnloadingItem(reader, 1)
    await requestedFromTheThirdItem

    expect(reader.spine.value.firstItemIndexAwaitingLayout).toBe(1)
  })
})
