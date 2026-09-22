// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import {
  createTestReader,
  installReaderTestEnvironment,
  mountTestReader,
  settledOn,
} from "../../tests/readerHarness"

installReaderTestEnvironment()

describe("navigation consolidation with pagination", () => {
  it("anchors the navigation only on settled positions", async () => {
    const reader = createTestReader()
    const anchors: { cfi: string | undefined; fromSettledResult: boolean }[] =
      []

    reader.navigation.internalNavigator.navigationSubject.subscribe((entry) => {
      if (entry.meta.triggeredBy !== "pagination") return

      const { isSettled, begin } = reader.pagination.state

      anchors.push({
        cfi: entry.paginationBeginCfi,
        fromSettledResult: isSettled && begin.cfi === entry.paginationBeginCfi,
      })
    })

    mountTestReader(reader)
    await settledOn(reader, 0)

    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    await settledOn(reader, 1)

    /**
     * A provisional result stands in with the item start, so anchoring on one
     * would restore the reader to the top of the item.
     */
    expect(
      anchors.filter(({ fromSettledResult }) => !fromSettledResult),
    ).toEqual([])
    expect(
      anchors.map(({ cfi }) => cfi && reader.cfi.parseCfi(cfi).itemIndex),
    ).toEqual([0, 1])
  })

  it("anchors a new navigation that settles on the same page", async () => {
    const reader = createTestReader()

    mountTestReader(reader)
    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    await settledOn(reader, 1)

    const anchor =
      reader.navigation.internalNavigator.navigation.paginationBeginCfi

    expect(anchor).toBeDefined()

    // The same page again is a fresh entry, and restoration reads the anchor
    // off the current entry, so it needs one of its own.
    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    await settledOn(reader, 1)

    expect(
      reader.navigation.internalNavigator.navigation.paginationBeginCfi,
    ).toBe(anchor)
  })
})
