// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import {
  createTestReader,
  installReaderTestEnvironment,
  mountTestReader,
  settledOn,
} from "../../tests/readerHarness"
import { waitFor } from "../../tests/utils"

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

  it("anchors the entry the result was computed for", async () => {
    const reader = createTestReader()
    const userIds: symbol[] = []
    const anchoredIds: symbol[] = []

    reader.navigation.internalNavigator.navigationSubject.subscribe((entry) => {
      if (entry.meta.triggeredBy === "user") userIds.push(entry.id)
      if (entry.meta.triggeredBy === "pagination") anchoredIds.push(entry.id)
    })

    mountTestReader(reader)
    await settledOn(reader, 0)

    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    await settledOn(reader, 1)

    /**
     * When the new page is already ready, its result settles synchronously,
     * inside the navigation's own notification. The anchor has to land on that
     * navigation and not on the one it replaced.
     */
    expect(anchoredIds.at(-1)).toBe(userIds.at(-1))
  })

  it("does not re-anchor when a relayout leaves the page unchanged", async () => {
    const reader = createTestReader()
    let anchors = 0

    reader.navigation.internalNavigator.navigationSubject.subscribe((entry) => {
      if (entry.meta.triggeredBy === "pagination") anchors += 1
    })

    mountTestReader(reader)
    await settledOn(reader)

    const anchorsBeforeLayout = anchors

    reader.layout()
    await settledOn(reader)
    await waitFor(50)

    // Same entry, same page: the settled result after the relayout is not news.
    expect(anchors).toBe(anchorsBeforeLayout)
  })
})
