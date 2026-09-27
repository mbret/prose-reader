// @vitest-environment jsdom
import { isShallowEqual } from "@prose-reader/shared"
import { filter, first } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import type {
  DocumentLoadStatus,
  DocumentRendererParams,
} from "../spineItem/renderer/DocumentRenderer"
import {
  createTestReader,
  installReaderTestEnvironment,
  mountTestReader,
  settledOn,
  TextDocumentRenderer,
} from "../tests/readerHarness"
import { isDefined } from "../utils/isDefined"

installReaderTestEnvironment()

describe("itemLoadStatusChange$", () => {
  it("emits each change of an item's load status, for every item, as the item holds it", async () => {
    // Only the item at the position loads.
    const reader = createTestReader({ numberOfAdjacentSpineItemToPreLoad: 0 })

    const changes: { index: number; loadStatus: DocumentLoadStatus }[] = []
    // A change delivered once the item has moved on: its state then says
    // something else.
    const changesTheItemNoLongerHolds: string[] = []
    reader.spineItemsObserver.itemLoadStatusChange$.subscribe(
      ({ item, loadStatus }) => {
        changes.push({ index: item.index, loadStatus })

        if (item.value.loadStatus !== loadStatus)
          changesTheItemNoLongerHolds.push(
            `${item.index} ${loadStatus}, holding ${item.value.loadStatus}`,
          )
      },
    )
    const loadStatusesOf = (index: number) =>
      changes
        .filter((change) => change.index === index)
        .map(({ loadStatus }) => loadStatus)

    expect(changes).toEqual([])

    mountTestReader(reader)
    await settledOn(reader, 0)

    expect(loadStatusesOf(0)).toEqual(["loading", "loaded"])
    expect(loadStatusesOf(1)).toEqual([])

    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    await settledOn(reader, 1)

    expect(loadStatusesOf(0)).toEqual([
      "loading",
      "loaded",
      "unloading",
      "idle",
    ])
    expect(loadStatusesOf(1)).toEqual(["loading", "loaded"])
    // The release completes at once, with the viewport free: each status is
    // still the item's as it is delivered.
    expect(changesTheItemNoLongerHolds).toEqual([])
  })
})

describe("the spine", () => {
  it("lays out once an item's document is released, which can change its size and the positions after it", async () => {
    // Both items load, the second next to the first.
    const reader = createTestReader({ numberOfAdjacentSpineItemToPreLoad: 1 })

    mountTestReader(reader)
    await settledOn(reader, 0)
    await vi.waitFor(() =>
      expect(reader.spineItemsManager.get(1)?.value.loadStatus).toBe("loaded"),
    )

    // What happens from now on, in order.
    const events: string[] = []
    reader.spineItemsObserver.itemLoadStatusChange$.subscribe(
      ({ item, loadStatus }) => {
        events.push(`${item.index} ${loadStatus}`)
      },
    )
    reader.spine.layout$.subscribe(() => {
      events.push("laid out")
    })

    // Only the item at the position loads now: the second is released.
    reader.settings.update({ numberOfAdjacentSpineItemToPreLoad: 0 })

    await vi.waitFor(() => {
      expect(events).toContain("1 idle")
      expect(events.slice(events.indexOf("1 idle"))).toContain("laid out")
    })
  })

  it("delivers every item state it lays out on to all of the item's subscribers before changing it", async () => {
    // Both items load, the second next to the first.
    const reader = createTestReader({ numberOfAdjacentSpineItemToPreLoad: 1 })

    mountTestReader(reader)
    await settledOn(reader, 0)

    const secondItem = reader.spineItemsManager.get(1)

    if (!secondItem) throw new Error("no second item")

    await vi.waitFor(() => expect(secondItem.value.loadStatus).toBe("loaded"))

    /**
     * Every state a subscriber receives is the item's state at that moment.
     * Laying out marks every item dirty: done while the item's release is
     * still being delivered, the dirty state reaches the subscribers after it
     * before the release does, and they end on a state the item left.
     */
    const outdatedStates: string[] = []
    reader.spineItemsObserver.itemStateChange$.subscribe(
      ({ item, ...state }) => {
        if (!isShallowEqual(state, item.value))
          outdatedStates.push(
            `${item.index} ${state.loadStatus} isDirty=${state.isDirty}`,
          )
      },
    )

    reader.settings.update({ numberOfAdjacentSpineItemToPreLoad: 0 })

    await vi.waitFor(() => expect(secondItem.value.loadStatus).toBe("idle"))
    await settledOn(reader, 0)

    expect(outdatedStates).toEqual([])
  })

  it("reads an item's writing mode from its document as it loads, even when the document is released at once", async () => {
    /**
     * Written vertically. The writing mode is read from the document, as the
     * html renderer reads its computed style, so there is none once the
     * document is released.
     */
    class VerticalTextDocumentRenderer extends TextDocumentRenderer {
      get writingMode(): "vertical-rl" | undefined {
        return this.getDocumentFrame() ? "vertical-rl" : undefined
      }
    }

    // Only the item at the position loads.
    const reader = createTestReader({
      getRenderer: () => (props: DocumentRendererParams) =>
        new VerticalTextDocumentRenderer(props),
      numberOfAdjacentSpineItemToPreLoad: 0,
    })
    const item = reader.spineItemsManager.get(0)

    if (!item) throw new Error("no first item")

    const verticalWritingFlags: boolean[] = []
    reader.context
      .watch("hasVerticalWriting")
      .pipe(filter(isDefined))
      .subscribe((hasVerticalWriting) => {
        verticalWritingFlags.push(hasVerticalWriting)
      })

    // Released as soon as it loads, in the same task: anything reading the
    // document later finds none.
    item
      .watch("loadStatus")
      .pipe(first((loadStatus) => loadStatus === "loaded"))
      .subscribe(() => {
        item.unload()
      })

    mountTestReader(reader)

    await vi.waitFor(() =>
      expect(verticalWritingFlags.length).toBeGreaterThan(0),
    )

    expect(verticalWritingFlags[0]).toBe(true)
  })
})
