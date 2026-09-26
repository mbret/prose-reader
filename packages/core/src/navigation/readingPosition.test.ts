// @vitest-environment jsdom
import { firstValueFrom, skip } from "rxjs"
import { describe, expect, it, onTestFinished, vi } from "vitest"
import { SpinePosition } from "../spine/types"
import {
  createEnhancedTestReader,
  createTestReader,
  holdItem,
  installReaderTestEnvironment,
  mountTestReader,
  renderTextDocuments,
  setTestViewport,
  settledOn,
  TextDocumentRenderer,
} from "../tests/readerHarness"
import { waitFor } from "../tests/utils"
import type { ReadingPosition } from "./types"

installReaderTestEnvironment()

/**
 * The test book is two items of one page each, each half the book: a position
 * is at the start of its item, 0 or a half.
 */
const itemStartProgression = (index: number) => index * 0.5

describe("reading position", () => {
  it("is the page a navigation goes to, from the moment it happens", async () => {
    const reader = createTestReader()

    mountTestReader(reader)
    await settledOn(reader, 0)

    /**
     * The turn keeps the viewport busy, so pagination is still resolving
     * while the navigation has already happened. The reading position does
     * not wait for it: the page a navigation goes to is known as soon as it
     * is laid out, and so is how far into the book it is.
     */
    reader.navigation.goToSpineItem({ indexOrId: 1, animation: "turn" })

    const atOnce = await firstValueFrom(reader.navigation.readingPosition$)

    expect(reader.pagination.state.isSettled).toBe(false)
    expect(reader.cfi.parseCfi(atOnce.cfi).itemIndex).toBe(1)
    expect(atOnce.percentageEstimateOfBook).toBe(itemStartProgression(1))

    const settled = await settledOn(reader, 1)

    expect(settled.begin.cfi).toBe(atOnce.cfi)
    expect(await firstValueFrom(reader.navigation.readingPosition$)).toEqual(
      atOnce,
    )
  })

  it("carries the progression of its own page with every value", async () => {
    const secondItem = holdItem("/page_1.jpg")
    const reader = createTestReader({ getRenderer: secondItem.getRenderer })

    const positions: ReadingPosition[] = []
    reader.navigation.readingPosition$.subscribe((position) => {
      positions.push(position)
    })

    mountTestReader(reader)
    await settledOn(reader, 0)

    /**
     * Into an item still loading, back before it settles, and into it again
     * once it has loaded: whatever pagination is doing, no value pairs a
     * position with the progression of another.
     */
    reader.navigation.goToSpineItem({ indexOrId: 1, animation: "turn" })
    await waitFor(50)
    reader.navigation.goToSpineItem({ indexOrId: 0, animation: false })
    secondItem.release()
    await settledOn(reader, 0)
    reader.navigation.goToCfi("epubcfi(/6/4[1]!/4/2)", { animate: false })
    await settledOn(reader, 1)

    expect(positions.length).toBeGreaterThan(2)

    for (const { cfi, percentageEstimateOfBook } of positions) {
      expect(percentageEstimateOfBook).toBe(
        itemStartProgression(reader.cfi.parseCfi(cfi).itemIndex ?? -1),
      )
    }
  })

  it("is short of the end of the book on its last page", async () => {
    const reader = createEnhancedTestReader()

    mountTestReader(reader)
    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })

    /**
     * Pagination's estimate is how far the end of what is visible reaches,
     * the whole book on its last page. The reading position is where that
     * page starts.
     */
    const settled = await settledOn(reader, 1)

    await vi.waitFor(() =>
      expect(reader.pagination.state.percentageEstimateOfBook).toBe(1),
    )
    expect(await firstValueFrom(reader.navigation.readingPosition$)).toEqual({
      cfi: settled.begin.cfi,
      percentageEstimateOfBook: itemStartProgression(1),
    })
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
    expect(await firstValueFrom(reader.navigation.readingPosition$)).toEqual({
      cfi: settled.begin.cfi,
      percentageEstimateOfBook: itemStartProgression(1),
    })
  })

  it("does not move when a relayout reflows the page around it", async () => {
    const reader = createTestReader()

    mountTestReader(reader)
    await settledOn(reader)

    const positions: ReadingPosition[] = []
    reader.navigation.readingPosition$.subscribe((position) => {
      positions.push(position)
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
    expect(await firstValueFrom(reader.navigation.readingPosition$)).toEqual({
      cfi: portrait.begin.cfi,
      percentageEstimateOfBook: itemStartProgression(1),
    })
  })

  it("is as far into the book as the page holding a cfi, even on the second page of a spread", async () => {
    setTestViewport({ width: 200, height: 100 })

    /**
     * In landscape the spread holding item 1 starts at item 0: the position
     * a cfi into item 1 goes to is item 0's page. The cfi is still on item
     * 1's page, and so is how far into the book it is. The items have
     * documents, where the cfi is found: without one, it would await a
     * document for good, and its page would never be looked for.
     */
    const cfi = "epubcfi(/6/4[1]!/4/2)"
    const reader = createTestReader({
      target: { type: "cfi", value: cfi },
      getRenderer: renderTextDocuments,
    })

    mountTestReader(reader)

    const spread = await settledOn(reader, 0)

    expect(spread.end.spineItemIndex).toBe(1)
    expect(await firstValueFrom(reader.navigation.readingPosition$)).toEqual({
      cfi,
      percentageEstimateOfBook: itemStartProgression(1),
    })
  })

  it("is the cfi a navigation asked for, before and after it settles", async () => {
    const reader = createTestReader()

    mountTestReader(reader)
    await settledOn(reader, 0)

    const positions: ReadingPosition[] = []
    reader.navigation.readingPosition$.subscribe((position) => {
      positions.push(position)
    })

    /**
     * A cfi names the exact place to reopen at. The page it settles on starts
     * at some other character, and saving that one instead would reopen at a
     * different page once the book is laid out differently.
     */
    const cfi = "epubcfi(/6/4[1]!/4/2)"

    reader.navigation.goToCfi(cfi, { animate: false })

    expect(positions.at(-1)).toEqual({
      cfi,
      percentageEstimateOfBook: itemStartProgression(1),
    })

    const settled = await settledOn(reader, 1)

    expect(settled.begin.cfi).not.toBe(cfi)
    expect(positions.at(-1)).toEqual({
      cfi,
      percentageEstimateOfBook: itemStartProgression(1),
    })
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
    expect(await firstValueFrom(reader.navigation.readingPosition$)).toEqual({
      cfi: reader.cfi.generateRootCfi(item.item),
      percentageEstimateOfBook: itemStartProgression(1),
    })

    secondItem.release()
    const second = await settledOn(reader, 1)

    expect(await firstValueFrom(reader.navigation.readingPosition$)).toEqual({
      cfi: second.begin.cfi,
      percentageEstimateOfBook: itemStartProgression(1),
    })
  })

  it("keeps the position while its item is unloaded", async () => {
    const reader = createTestReader({ numberOfAdjacentSpineItemToPreLoad: 0 })

    mountTestReader(reader)
    await settledOn(reader, 0)

    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    const settled = await settledOn(reader, 1)

    const positions: ReadingPosition[] = []
    reader.navigation.readingPosition$.subscribe((position) => {
      positions.push(position)
    })

    const expected = {
      cfi: settled.begin.cfi,
      percentageEstimateOfBook: itemStartProgression(1),
    }

    expect(positions).toEqual([expected])

    const item = reader.spineItemsManager.get(1)

    if (!item) throw new Error("item 1 is missing")

    item.unload()
    await vi.waitFor(() => expect(item.value.isReady).toBe(false))

    // The loader reloads a visible item; the position is the same page.
    await settledOn(reader, 1)

    expect(positions).toEqual([expected])
  })
})

/**
 * Items with a document, where a cfi names a place or nothing: their body holds
 * one paragraph, `/4/2`, and nothing is at `/4/2/999`.
 */
describe("reading position of a cfi into a document", () => {
  // A real item, with a path to nothing in it, as a saved position has once
  // the book changed.
  const cfiNamingNothing = "epubcfi(/6/4[1]!/4/2/999/1:0)"
  const cfiNamingText = "epubcfi(/6/4[1]!/4/2/1:2)"

  /** A reading position in the second item, which starts half into the book. */
  const inSecondItem = (cfi: string): ReadingPosition => ({
    cfi,
    percentageEstimateOfBook: itemStartProgression(1),
  })

  /** Every reading position from now on, without the current one. */
  const recordReadingPositions = (
    reader: ReturnType<typeof createTestReader>,
  ) => {
    const positions: ReadingPosition[] = []

    reader.navigation.readingPosition$.pipe(skip(1)).subscribe((position) => {
      positions.push(position)
    })

    return positions
  }

  it("is the cfi asked for while its item loads, then the page landed on once the document shows it names nothing", async () => {
    const secondItem = holdItem("/page_1.jpg", TextDocumentRenderer)
    const reader = createTestReader({ getRenderer: secondItem.getRenderer })

    mountTestReader(reader)
    await settledOn(reader, 0)

    const positions = recordReadingPositions(reader)

    reader.navigation.goToCfi(cfiNamingNothing, { animate: false })

    /**
     * Until the document is there, a cfi naming nothing cannot be told from
     * one naming a place, so it is kept as asked, and a relayout meanwhile
     * does not drop it.
     */
    expect(positions).toEqual([inSecondItem(cfiNamingNothing)])

    reader.layout()
    await firstValueFrom(reader.spine.layout$)

    expect(reader.spineItemsManager.get(1)?.value.isLoaded).toBe(false)
    expect(positions).toEqual([inSecondItem(cfiNamingNothing)])

    secondItem.release()

    const settled = await settledOn(reader, 1)

    /**
     * The document shows the cfi names nothing: the reader is at the start of
     * the item, and the reading position is the page it is on, not a place it
     * is not at.
     */
    expect(settled.begin.cfi).not.toBe(cfiNamingNothing)
    expect(positions).toEqual([
      inSecondItem(cfiNamingNothing),
      inSecondItem(settled.begin.cfi),
    ])

    reader.layout()
    await settledOn(reader, 1)

    expect(positions).toEqual([
      inSecondItem(cfiNamingNothing),
      inSecondItem(settled.begin.cfi),
    ])
  })

  it("is only the page landed on when the cfi names nothing in an item already loaded", async () => {
    const reader = createTestReader({ getRenderer: renderTextDocuments })

    mountTestReader(reader)
    await settledOn(reader, 0)

    // The adjacent item is preloaded.
    await vi.waitFor(() =>
      expect(reader.spineItemsManager.get(1)?.value.isReady).toBe(true),
    )

    const positions = recordReadingPositions(reader)

    reader.navigation.goToCfi(cfiNamingNothing, { animate: false })

    const settled = await settledOn(reader, 1)

    expect(positions).toEqual([inSecondItem(settled.begin.cfi)])
  })

  it("stays the cfi asked for once the document shows it names a place", async () => {
    const secondItem = holdItem("/page_1.jpg", TextDocumentRenderer)
    const reader = createTestReader({ getRenderer: secondItem.getRenderer })

    mountTestReader(reader)
    await settledOn(reader, 0)

    const positions = recordReadingPositions(reader)

    reader.navigation.goToCfi(cfiNamingText, { animate: false })
    secondItem.release()

    const settled = await settledOn(reader, 1)

    expect(settled.begin.cfi).not.toBe(cfiNamingText)
    expect(positions).toEqual([inSecondItem(cfiNamingText)])
  })
})
