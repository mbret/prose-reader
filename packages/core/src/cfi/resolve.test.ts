// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import {
  createTestReader,
  holdItemDocumentLoadHooks,
  installReaderTestEnvironment,
  mountTestReader,
  renderTextDocuments,
  settledOn,
} from "../tests/readerHarness"

installReaderTestEnvironment()

const cfiNamingText = "epubcfi(/6/4[1]!/4/2/1:2)"
const text = "A paragraph of text."

describe("resolveCfi", () => {
  it("resolves into its item's loaded document only, not into the one its frame holds while the item loads or unloads", async () => {
    // Item 1 loads only once the reader goes there, and leaves once it goes
    // back.
    const reader = createTestReader({
      getRenderer: renderTextDocuments,
      numberOfAdjacentSpineItemToPreLoad: 0,
    })
    const documentLoadHooks = holdItemDocumentLoadHooks(reader, "1")

    mountTestReader(reader)
    await settledOn(reader, 0)

    const item = reader.spineItemsManager.get(1)

    if (!item) throw new Error("item 1 is missing")

    const getFrameText = () =>
      item.renderer.getDocumentFrame()?.contentDocument?.body.textContent ??
      undefined
    const getResolvedText = () =>
      reader.cfi.resolveCfi({ cfi: cfiNamingText }).node?.textContent ??
      undefined

    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    await vi.waitFor(() => expect(getFrameText()).toBe(text))

    expect(item.value.loadStatus).toBe("loading")
    expect(getResolvedText()).toBeUndefined()

    documentLoadHooks.release()
    await settledOn(reader, 1)

    expect(getResolvedText()).toBe(text)

    const resolvedWhileReleased: {
      frameText: string | undefined
      resolvedText: string | undefined
    }[] = []

    reader.hookManager.register("item.onDocumentUnload", ({ itemId }) => {
      if (itemId !== "1") return

      resolvedWhileReleased.push({
        frameText: getFrameText(),
        resolvedText: getResolvedText(),
      })
    })

    reader.navigation.goToSpineItem({ indexOrId: 0, animation: false })
    await vi.waitFor(() => expect(item.value.loadStatus).toBe("idle"))

    expect(resolvedWhileReleased).toEqual([
      { frameText: text, resolvedText: undefined },
    ])
  })
})
