// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import type { DocumentLoadStatus } from "../../spineItem/renderer/DocumentRenderer"
import {
  createTestReader,
  installReaderTestEnvironment,
  mountTestReader,
  renderTextDocuments,
  settledOn,
} from "../../tests/readerHarness"
import { trackSpineItemSelection } from "./trackSpineItemSelection"

installReaderTestEnvironment()

/** Each selection reported, with the item's load status as it is reported. */
const recordSelections = (
  item: Parameters<typeof trackSpineItemSelection>[0],
) => {
  const reported: {
    selectedText: string | undefined
    loadStatus: DocumentLoadStatus
  }[] = []

  trackSpineItemSelection(item).subscribe((entry) => {
    reported.push({
      selectedText: entry?.selection.toString(),
      loadStatus: item.value.loadStatus,
    })
  })

  return reported
}

describe("trackSpineItemSelection", () => {
  it("reports the selection in the item's document while it is loaded, and none from the moment the document starts leaving", async () => {
    // Only the item at the position loads.
    const reader = createTestReader({
      getRenderer: renderTextDocuments,
      numberOfAdjacentSpineItemToPreLoad: 0,
    })

    mountTestReader(reader)
    await settledOn(reader, 0)

    const item = reader.spineItemsManager.get(0)
    const document = item?.renderer.getDocumentFrame()?.contentDocument

    if (!item || !document) throw new Error("no loaded first item")

    const reported = recordSelections(item)

    // The document reports the change, as a browser does.
    document.getSelection()?.selectAllChildren(document.body)

    await vi.waitFor(() =>
      expect(reported).toEqual([
        { selectedText: "A paragraph of text.", loadStatus: "loaded" },
      ]),
    )

    // The reader moves on: the first item's document is released.
    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    await vi.waitFor(() => expect(item.value.loadStatus).toBe("idle"))

    expect(reported).toEqual([
      { selectedText: "A paragraph of text.", loadStatus: "loaded" },
      { selectedText: undefined, loadStatus: "unloading" },
    ])

    // What happens in the released document is no longer tracked.
    document.dispatchEvent(new Event("selectionchange"))

    expect(reported).toHaveLength(2)
  })

  it("reports no selection for an item whose document is not loaded", async () => {
    const reader = createTestReader({
      getRenderer: renderTextDocuments,
      numberOfAdjacentSpineItemToPreLoad: 0,
    })

    mountTestReader(reader)
    await settledOn(reader, 0)

    const item = reader.spineItemsManager.get(1)

    if (!item) throw new Error("no second item")

    expect(recordSelections(item)).toEqual([
      { selectedText: undefined, loadStatus: "idle" },
    ])
  })
})
