// @vitest-environment jsdom
import { filter, firstValueFrom } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import {
  createTestReader,
  holdItem,
  installReaderTestEnvironment,
  mountTestReader,
  setTestViewport,
  settledOn,
} from "../tests/readerHarness"
import { waitFor } from "../tests/utils"

installReaderTestEnvironment()

describe("reading position", () => {
  it("only ever is a settled position", async () => {
    const reader = createTestReader()
    const positions: { cfi: string; isSettledResult: boolean }[] = []

    reader.navigation.readingPosition$.subscribe((cfi) => {
      const { isSettled, begin } = reader.pagination.state

      positions.push({ cfi, isSettledResult: isSettled && begin.cfi === cfi })
    })

    mountTestReader(reader)
    await settledOn(reader, 0)

    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    await settledOn(reader, 1)

    /**
     * A provisional result stands in with the item start, so saving one would
     * reopen the book at the top of the item.
     */
    expect(positions.filter(({ isSettledResult }) => !isSettledResult)).toEqual(
      [],
    )
    expect(
      positions.map(({ cfi }) => reader.cfi.parseCfi(cfi).itemIndex),
    ).toEqual([0, 1])
  })

  it("is the position of the navigation the result was computed for", async () => {
    const reader = createTestReader()

    mountTestReader(reader)
    await settledOn(reader, 0)

    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    await settledOn(reader, 1)

    /**
     * When the new page is already ready, its result settles synchronously,
     * inside the navigation's own notification. The position has to be the
     * new navigation's and not the one it replaced.
     */
    const position = await firstValueFrom(reader.navigation.readingPosition$)

    expect(reader.cfi.parseCfi(position).itemIndex).toBe(1)
  })

  it("does not move when a relayout reflows the page around it", async () => {
    const reader = createTestReader()

    mountTestReader(reader)
    await settledOn(reader)

    const positions: string[] = []
    reader.navigation.readingPosition$.subscribe((cfi) => {
      positions.push(cfi)
    })

    reader.layout()
    await settledOn(reader)
    await waitFor(50)

    // The replayed current one, and nothing since: a relayout is not a move.
    expect(positions).toHaveLength(1)
  })

  it("stays on the page navigated to when a relayout shows it second in a spread", async () => {
    const reader = createTestReader()

    mountTestReader(reader)
    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    const portrait = await settledOn(reader, 1)

    /**
     * Landscape makes the pages a spread, and the spread holding item 1 starts
     * at item 0. The visible range now begins one page earlier; the reader did
     * not move. Following it would reopen the book a page back in portrait, and
     * every rotation would walk the reader further back.
     */
    setTestViewport({ width: 200, height: 100 })
    reader.layout()

    const landscape = await settledOn(reader, 0)

    expect(landscape.end.spineItemIndex).toBe(1)
    expect(await firstValueFrom(reader.navigation.readingPosition$)).toBe(
      portrait.begin.cfi,
    )
  })

  it("is the cfi a navigation asked for, before and after it settles", async () => {
    const reader = createTestReader()

    mountTestReader(reader)
    await settledOn(reader, 0)

    const positions: string[] = []
    reader.navigation.readingPosition$.subscribe((cfi) => {
      positions.push(cfi)
    })

    /**
     * A cfi names the exact place to reopen at. The page it settles on starts
     * at some other character, and saving that one instead would reopen at a
     * different page once the book is laid out differently.
     */
    const cfi = "epubcfi(/6/4[1]!/4/2)"

    reader.navigation.goToCfi(cfi, { animate: false })

    expect(positions.at(-1)).toBe(cfi)

    const settled = await settledOn(reader, 1)

    expect(settled.begin.cfi).not.toBe(cfi)
    expect(positions.at(-1)).toBe(cfi)
  })

  it("keeps the previous position until a navigation without a cfi settles", async () => {
    const secondItem = holdItem("/page_1.jpg")
    const reader = createTestReader({ getRenderer: secondItem.getRenderer })

    mountTestReader(reader)
    const first = await settledOn(reader, 0)

    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    await waitFor(100)

    /**
     * Item 1 is still loading, so only a placeholder exists for it. Saving
     * that would trade a precise position for the top of an item.
     */
    expect(reader.pagination.state.isSettled).toBe(false)
    expect(await firstValueFrom(reader.navigation.readingPosition$)).toBe(
      first.begin.cfi,
    )

    secondItem.release()
    const second = await settledOn(reader, 1)

    expect(await firstValueFrom(reader.navigation.readingPosition$)).toBe(
      second.begin.cfi,
    )
  })

  it("keeps the position while its item is unloaded", async () => {
    const reader = createTestReader({ numberOfAdjacentSpineItemToPreLoad: 0 })

    mountTestReader(reader)
    await settledOn(reader, 0)

    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    const settled = await settledOn(reader, 1)

    const positions: string[] = []
    reader.navigation.readingPosition$.subscribe((cfi) => {
      positions.push(cfi)
    })

    expect(positions).toEqual([settled.begin.cfi])

    const item = reader.spineItemsManager.get(1)

    if (!item) throw new Error("item 1 is missing")

    item.unload()
    await vi.waitFor(() => expect(item.value.isReady).toBe(false))

    // The loader reloads a visible item; the position is the same page.
    await settledOn(reader, 1)

    expect(positions).toEqual([settled.begin.cfi])
  })

  it("never takes the page of a navigation superseded while its result was pending", async () => {
    const reader = createTestReader()

    mountTestReader(reader)
    await settledOn(reader, 0)

    const items: number[] = []
    reader.navigation.readingPosition$.subscribe((cfi) => {
      items.push(reader.cfi.parseCfi(cfi).itemIndex)
    })

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
     * completed, the page it was computed for would have become the position
     * of whichever navigation was current by then.
     */
    expect(items).not.toContain(1)
    expect(items.at(-1)).toBe(0)
  })
})
