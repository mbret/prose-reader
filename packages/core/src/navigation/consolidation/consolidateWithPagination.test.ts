// @vitest-environment jsdom
import { filter, firstValueFrom } from "rxjs"
import { describe, expect, it, vi } from "vitest"
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

  it("does not re-anchor an entry a relayout kept", async () => {
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

    // A relayout keeps the entry, and an entry is anchored once.
    expect(anchors).toBe(anchorsBeforeLayout)
  })

  it("keeps the anchor while its item is unloaded", async () => {
    const reader = createTestReader({ numberOfAdjacentSpineItemToPreLoad: 0 })
    const anchors: (string | undefined)[] = []

    reader.navigation.internalNavigator.navigationSubject.subscribe((entry) => {
      anchors.push(entry.paginationBeginCfi)
    })

    mountTestReader(reader)
    await settledOn(reader, 0)

    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    const settled = await settledOn(reader, 1)

    const anchor =
      reader.navigation.internalNavigator.navigation.paginationBeginCfi

    expect(anchor).toBe(settled.begin.cfi)

    const item = reader.spineItemsManager.get(1)

    if (!item) throw new Error("item 1 is missing")

    const entriesBeforeUnload = anchors.length

    item.unload()
    await vi.waitFor(() => expect(item.value.isReady).toBe(false))

    /**
     * An unloaded item has nothing to anchor to, and a provisional result
     * stands in with the item start. The entry keeps the anchor it had, which
     * is what restoration will need once the item is back.
     */
    expect(
      reader.navigation.internalNavigator.navigation.paginationBeginCfi,
    ).toBe(anchor)
    expect(anchors.slice(entriesBeforeUnload)).not.toContain(undefined)

    // The loader reloads a visible item; the anchor is the same page.
    await settledOn(reader, 1)

    expect(
      reader.navigation.internalNavigator.navigation.paginationBeginCfi,
    ).toBe(anchor)
  })

  it("never anchors a navigation that was superseded while its result was pending", async () => {
    const reader = createTestReader()
    /** Spine item each user entry navigated to, by entry id. */
    const targets = new Map<symbol, number | string | undefined>()
    const anchors: { id: symbol; item: number }[] = []

    reader.navigation.internalNavigator.navigationSubject.subscribe((entry) => {
      if (entry.meta.triggeredBy === "user")
        targets.set(entry.id, entry.spineItem)

      if (entry.meta.triggeredBy === "pagination" && entry.paginationBeginCfi) {
        anchors.push({
          id: entry.id,
          item: reader.cfi.parseCfi(entry.paginationBeginCfi).itemIndex,
        })
      }
    })

    mountTestReader(reader)
    await settledOn(reader, 0)
    anchors.length = 0

    // The turn keeps the viewport busy, so the positions pass for item 1 is
    // still pending when the next navigation supersedes it.
    reader.navigation.goToSpineItem({ indexOrId: 1, animation: "turn" })
    reader.navigation.goToSpineItem({ indexOrId: 0, animation: "turn" })

    await settledOn(reader, 0)
    await firstValueFrom(
      reader.navigation.navigationState$.pipe(
        filter((state) => state === "free"),
      ),
    )

    /**
     * A superseded resolution must be cancelled, not merely outrun: had it
     * completed, it would have anchored the page it was computed for onto
     * whichever entry was current by then.
     */
    expect(anchors.map(({ item }) => item)).not.toContain(1)
    expect(anchors.map(({ item }) => item)).toContain(0)
    expect(anchors.filter(({ id, item }) => targets.get(id) !== item)).toEqual(
      [],
    )
  })
})
