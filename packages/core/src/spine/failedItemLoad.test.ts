// @vitest-environment jsdom
import { filter, firstValueFrom, throwError } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import type { ReadingPosition } from "../navigation/types"
import type { DocumentRendererParams } from "../spineItem/renderer/DocumentRenderer"
import {
  createTestReader,
  installReaderTestEnvironment,
  mountTestReader,
  settledOn,
  TextDocumentRenderer,
} from "../tests/readerHarness"
import { waitFor } from "../tests/utils"

installReaderTestEnvironment()

/**
 * Renders the second item as a text document whose first `failures` loads
 * fail, the way a resource that cannot be fetched fails, and every other item
 * as a text document.
 */
const failSecondItemLoads = (failures: number) => {
  let failedLoads = 0

  class FailingTextDocumentRenderer extends TextDocumentRenderer {
    onLoadDocument() {
      if (failedLoads >= failures) return super.onLoadDocument()

      failedLoads += 1

      return throwError(() => new Error(`resource failed`))
    }
  }

  return {
    getRenderer: (item: { href: string }) => (props: DocumentRendererParams) =>
      item.href === "/page_1.jpg"
        ? new FailingTextDocumentRenderer(props)
        : new TextDocumentRenderer(props),
    failedLoads: () => failedLoads,
  }
}

const readingPositionOf = (reader: ReturnType<typeof createTestReader>) =>
  firstValueFrom(reader.navigation.readingPosition$)

const loadFailureOf = (
  reader: ReturnType<typeof createTestReader>,
  index: number,
) => {
  const spineItem = reader.spineItemsManager.get(index)

  if (!spineItem) throw new Error(`no item ${index}`)

  return firstValueFrom(
    spineItem
      .watch("loadStatus")
      .pipe(filter((loadStatus) => loadStatus === "error")),
  )
}

/**
 * The reader loads the items around the position 100ms after each layout, and
 * a failed load lays the spine out. Loading an item in error again there
 * would fail it again every cycle: this is several of them.
 */
const waitForLoadCycles = () => waitFor(500)

// A place in the second item's text, which starts half into the book.
const cfiNamingText = "epubcfi(/6/4[1]!/4/2/1:2)"
const secondItemStart = "epubcfi(/6/4[1]!)"

describe("an item whose load fails", () => {
  it("does not keep the item next to it from settling, nor its reading position from being a success, and is not loaded again while it stays next to it", async () => {
    const secondItem = failSecondItemLoads(Number.POSITIVE_INFINITY)
    // The second item is preloaded next to the first.
    const reader = createTestReader({ getRenderer: secondItem.getRenderer })

    mountTestReader(reader)

    await loadFailureOf(reader, 1)

    /**
     * The failure is the item's state. Loads of other items still reach the
     * spine, which keeps laying out, so the first item settles.
     */
    const settled = await settledOn(reader, 0)

    expect(await readingPositionOf(reader)).toEqual({
      cfi: settled.begin.cfi,
      percentageEstimateOfBook: 0,
      status: "success",
    } satisfies ReadingPosition)

    reader.layout()
    await settledOn(reader, 0)
    await waitForLoadCycles()

    expect(secondItem.failedLoads()).toBe(1)
  })

  it("ends a navigation into it in error, on which pagination settles, and a layout does not load it again", async () => {
    const secondItem = failSecondItemLoads(Number.POSITIVE_INFINITY)
    const reader = createTestReader({
      getRenderer: secondItem.getRenderer,
      numberOfAdjacentSpineItemToPreLoad: 0,
    })

    mountTestReader(reader)
    await settledOn(reader, 0)

    const positions: ReadingPosition[] = []
    reader.navigation.readingPosition$.subscribe((position) => {
      positions.push(position)
    })

    reader.navigation.goToCfi(cfiNamingText, { animate: false })

    await loadFailureOf(reader, 1)

    /**
     * Nothing can show where the cfi leads: the reading position stood in at
     * the item's start while it loaded, and ends there, in error. Pagination
     * settles on the item in error rather than waiting for it forever.
     */
    const settled = await settledOn(reader, 1)
    const endedInError: ReadingPosition = {
      cfi: secondItemStart,
      percentageEstimateOfBook: 0.5,
      status: "error",
    }

    expect(settled.begin.spineItemIndex).toBe(1)
    expect(positions.slice(-2)).toEqual([
      { ...endedInError, status: "pending" },
      endedInError,
    ])

    reader.layout()
    await settledOn(reader, 1)
    await waitForLoadCycles()

    expect(secondItem.failedLoads()).toBe(1)
    expect(await readingPositionOf(reader)).toEqual(endedInError)
  })

  it("ends the navigation the reader opens with in error when its item fails, with nothing else loading or unloading", async () => {
    const secondItem = failSecondItemLoads(Number.POSITIVE_INFINITY)
    // Only the item at the position loads, and nothing else moves.
    const reader = createTestReader({
      target: { type: "cfi", value: cfiNamingText },
      getRenderer: secondItem.getRenderer,
      numberOfAdjacentSpineItemToPreLoad: 0,
    })

    mountTestReader(reader)

    await loadFailureOf(reader, 1)

    /**
     * The failure is the one change left to lay the spine out on. That layout
     * restores the navigation, which ends in error...
     */
    await vi.waitFor(async () =>
      expect(await readingPositionOf(reader)).toEqual({
        cfi: secondItemStart,
        percentageEstimateOfBook: 0.5,
        status: "error",
      } satisfies ReadingPosition),
    )

    // ...and lets pagination settle on the item.
    const settled = await settledOn(reader, 1)

    expect(settled.begin.spineItemIndex).toBe(1)
    expect(reader.spineItemsManager.get(0)?.value.loadStatus).toBe("idle")
  })

  it("is loaded again once it has left the items around the position and comes back into them", async () => {
    const secondItem = failSecondItemLoads(1)
    const reader = createTestReader({
      getRenderer: secondItem.getRenderer,
      numberOfAdjacentSpineItemToPreLoad: 0,
    })

    mountTestReader(reader)
    await settledOn(reader, 0)

    reader.navigation.goToCfi(cfiNamingText, { animate: false })
    await loadFailureOf(reader, 1)
    await settledOn(reader, 1)

    expect(await readingPositionOf(reader)).toMatchObject({ status: "error" })

    // Only the item at the position loads: the second one is unloaded.
    reader.navigation.goToSpineItem({ indexOrId: 0, animation: false })
    await settledOn(reader, 0)

    reader.navigation.goToCfi(cfiNamingText, { animate: false })
    await settledOn(reader, 1)

    expect(secondItem.failedLoads()).toBe(1)
    expect(reader.spineItemsManager.get(1)?.value.isReady).toBe(true)
    expect(await readingPositionOf(reader)).toMatchObject({
      cfi: cfiNamingText,
      status: "success",
    })
  })
})
