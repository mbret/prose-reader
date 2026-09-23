// @vitest-environment happy-dom
// @vitest-environment-options {"settings":{"disableCSSFileLoading":true,"disableJavaScriptFileLoading":true,"handleDisabledFileLoadingAsSuccess":true}}
import { describe, expect, it, vi } from "vitest"
import { setup } from "../../core/src/positions/testUtils"
import { createTestManifest } from "../../core/src/tests/utils"
import { koreaderPositionFormat } from "./positionFormat"
import { resolveXPointer } from "./resolve"
import { openFixtureBook, readOracle } from "./tests/epub"

describe("koreaderPositionFormat with the reader", () => {
  it("opens a fixture at an oracle XPointer and publishes both representations", async () => {
    const book = await openFixtureBook("accessible-epub-3")
    const oracle = await readOracle("accessible-epub-3")
    const fragment = oracle.fragments.find((item) => item.words.length > 0)
    const pointer = fragment?.words[0]?.[0]
    if (!fragment || !pointer) throw new Error("Expected oracle position")
    const fixtureItem = book.spineItems[fragment.index]
    if (!fixtureItem) throw new Error("Expected fixture item")
    const { reader, frames, load, settled } = setup({
      manifest: createTestManifest({ spineItems: book.spineItems }),
      position: { format: "koreader", value: pointer },
    })
    const frame = frames[fragment.index]
    if (!frame) throw new Error("Expected frame")
    frame.doc.body.innerHTML = fixtureItem.document.body.innerHTML
    const domPosition = resolveXPointer(pointer, frame.doc)
    if (!domPosition) throw new Error("Expected resolved oracle position")
    const pageLookup = vi
      .mocked(reader.spine.pages.fromSpineItemPageIndex)
      .getMockImplementation()
    vi.spyOn(reader.spine.pages, "fromSpineItemPageIndex").mockImplementation(
      (item, index) => {
        const page = pageLookup?.(item, index)
        return page
          ? {
              ...page,
              firstVisibleNode: {
                ...domPosition,
                offset: domPosition.offset ?? 0,
              },
            }
          : undefined
      },
    )
    reader.positions.register(koreaderPositionFormat)
    const container = document.createElement("div")
    reader.mount(container)
    expect(reader.navigation.getNavigation().target).toEqual({
      format: "koreader",
      value: pointer,
    })
    load(fragment.index)
    await settled()
    const { positions } = reader.pagination.state.begin
    expect(positions["koreader"]).toBe(pointer)
    const canonical = reader.cfi.resolveCfi({ cfi: positions.cfi ?? "" })
    expect(canonical.node).toBe(domPosition.node)
    expect(canonical.offset).toBe(domPosition.offset)
    expect(reader.navigation.getNavigation().target).toBeUndefined()
  })
})
