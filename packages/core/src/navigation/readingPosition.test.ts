// @vitest-environment jsdom
import { firstValueFrom } from "rxjs"
import { describe, expect, it, onTestFinished, vi } from "vitest"
import { SpinePosition } from "../spine/types"
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
  it("is the page a navigation goes to, from the moment it happens", async () => {
    const reader = createTestReader()

    mountTestReader(reader)
    await settledOn(reader, 0)

    /**
     * The turn keeps the viewport busy, so pagination is still resolving
     * while the navigation has already happened. The reading position does
     * not wait for it: the page a navigation goes to is known as soon as it
     * is laid out.
     */
    reader.navigation.goToSpineItem({ indexOrId: 1, animation: "turn" })

    const atOnce = await firstValueFrom(reader.navigation.readingPosition$)

    expect(reader.pagination.state.isSettled).toBe(false)
    expect(reader.cfi.parseCfi(atOnce).itemIndex).toBe(1)

    const settled = await settledOn(reader, 1)

    expect(settled.begin.cfi).toBe(atOnce)
    expect(await firstValueFrom(reader.navigation.readingPosition$)).toBe(
      atOnce,
    )
  })

  it("is the page that shows first, not the item a scroll barely left", async () => {
    // jsdom has no element scrolling; the scroll navigation controller only
    // needs the offsets it writes to be kept.
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value(this: HTMLElement, options?: ScrollToOptions) {
        this.scrollLeft = options?.left ?? 0
        this.scrollTop = options?.top ?? 0
      },
    })
    onTestFinished(() => {
      Reflect.deleteProperty(HTMLElement.prototype, "scrollTo")
    })

    const reader = createTestReader({ pageTurnMode: "scrollable" })

    mountTestReader(reader)
    await settledOn(reader, 0)

    /**
     * Items are stacked one viewport tall. Nine tenths down the first, only a
     * sliver of it is left at the top: the navigation's item is still the
     * first, while the page that shows is the second's.
     */
    const { height } = reader.spine.getSpineItemSpineLayoutInfo(0)

    reader.navigation.navigate({
      target: {
        type: "position",
        value: new SpinePosition({ x: 0, y: height * 0.9 }),
      },
      animation: false,
    })

    const settled = await settledOn(reader, 1)

    expect(reader.navigation.getNavigation().spineItem).toBe(0)
    expect(await firstValueFrom(reader.navigation.readingPosition$)).toBe(
      settled.begin.cfi,
    )
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

  it("is at the item navigated to at once, while its page is still loading", async () => {
    const secondItem = holdItem("/page_1.jpg")
    const reader = createTestReader({ getRenderer: secondItem.getRenderer })

    mountTestReader(reader)
    await settledOn(reader, 0)

    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    await waitFor(100)

    /**
     * Item 1 is still loading, so its page is not known yet. The reader has
     * left item 0 all the same: reopening there would be in the wrong item,
     * where item 1's start is at worst the wrong page of the right one.
     */
    const item = reader.spineItemsManager.get(1)

    if (!item) throw new Error("item 1 is missing")

    expect(reader.pagination.state.isSettled).toBe(false)
    expect(await firstValueFrom(reader.navigation.readingPosition$)).toBe(
      reader.cfi.generateRootCfi(item.item),
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
})
