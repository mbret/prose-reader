// @vitest-environment jsdom
import { filter, firstValueFrom, throwError } from "rxjs"
import { describe, expect, it } from "vitest"
import type { ReadingPosition } from "../navigation/types"
import type { DocumentRendererParams } from "../spineItem/renderer/DocumentRenderer"
import {
  createTestReader,
  installReaderTestEnvironment,
  mountTestReader,
  settledOn,
  TextDocumentRenderer,
} from "../tests/readerHarness"

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

  return firstValueFrom(spineItem.watch("isError").pipe(filter(Boolean)))
}

describe("an item whose load fails", () => {
  it("does not keep the item next to it from settling, nor its reading position from being a success", async () => {
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

    expect(secondItem.failedLoads()).toBeGreaterThan(0)
    expect(await readingPositionOf(reader)).toEqual({
      cfi: settled.begin.cfi,
      percentageEstimateOfBook: 0,
      status: "success",
    } satisfies ReadingPosition)
  })

  it("is loaded again by a later load, and a navigation into it goes on to its place", async () => {
    const secondItem = failSecondItemLoads(1)
    const reader = createTestReader({
      getRenderer: secondItem.getRenderer,
      numberOfAdjacentSpineItemToPreLoad: 0,
    })
    const cfiNamingText = "epubcfi(/6/4[1]!/4/2/1:2)"

    mountTestReader(reader)
    await settledOn(reader, 0)

    reader.navigation.goToCfi(cfiNamingText, { animate: false })

    await loadFailureOf(reader, 1)

    // Nothing shows where the cfi leads: the reading position stands in at the
    // item's start, pending, and pagination does not settle on an item that is
    // not ready.
    expect(await readingPositionOf(reader)).toMatchObject({
      cfi: "epubcfi(/6/4[1]!)",
      status: "pending",
    })
    expect(reader.pagination.state.isSettled).toBe(false)

    // A layout is one of the times the reader loads the items around the
    // position; this load works.
    reader.layout()

    await settledOn(reader, 1)

    expect(secondItem.failedLoads()).toBe(1)
    expect(await readingPositionOf(reader)).toMatchObject({
      cfi: cfiNamingText,
    })
  })
})
