// @vitest-environment jsdom
import { EMPTY, filter, firstValueFrom, of, skip } from "rxjs"
import { describe, expect, it, onTestFinished, vi } from "vitest"
import { getPageStartProgression } from "../pagination/progression"
import { SpinePosition } from "../spine/types"
import { DefaultRenderer } from "../spineItem/renderer/DefaultRenderer"
import { DocumentRenderer } from "../spineItem/renderer/DocumentRenderer"
import {
  createEnhancedTestReader,
  createTestReader,
  holdItem,
  installReaderTestEnvironment,
  mountTestReader,
  setTestViewport,
  settledOn,
} from "../tests/readerHarness"
import { createTestManifest, waitFor } from "../tests/utils"
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
     * is laid out, and so is how far into the book it is. The item is
     * preloaded, so the value is final at once.
     */
    reader.navigation.goToSpineItem({ indexOrId: 1, animation: "turn" })

    const atOnce = await firstValueFrom(reader.navigation.readingPosition$)

    expect(reader.pagination.state.isSettled).toBe(false)
    expect(reader.cfi.parseCfi(atOnce.cfi).itemIndex).toBe(1)
    expect(atOnce.percentageEstimateOfBook).toBe(itemStartProgression(1))
    expect(atOnce.isFinal).toBe(true)

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
      isFinal: true,
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
      isFinal: true,
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
      isFinal: true,
    })
  })

  it("is as far into the book as the page holding a cfi, even on the second page of a spread", async () => {
    setTestViewport({ width: 200, height: 100 })

    /**
     * In landscape the spread holding item 1 starts at item 0: the position
     * a cfi into item 1 goes to is item 0's page. The cfi is still on item
     * 1's page, and so is how far into the book it is.
     */
    const cfi = "epubcfi(/6/4[1]!/4/2)"
    const reader = createTestReader({ target: { type: "cfi", value: cfi } })

    mountTestReader(reader)

    const spread = await settledOn(reader, 0)

    expect(spread.end.spineItemIndex).toBe(1)
    expect(await firstValueFrom(reader.navigation.readingPosition$)).toEqual({
      cfi,
      percentageEstimateOfBook: itemStartProgression(1),
      isFinal: true,
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
     * different page once the book is laid out differently. The item is
     * preloaded, so the page holding the cfi is known at once.
     */
    const cfi = "epubcfi(/6/4[1]!/4/2)"
    const expected = {
      cfi,
      percentageEstimateOfBook: itemStartProgression(1),
      isFinal: true,
    }

    reader.navigation.goToCfi(cfi, { animate: false })

    expect(positions.at(-1)).toEqual(expected)

    const settled = await settledOn(reader, 1)

    expect(settled.begin.cfi).not.toBe(cfi)
    expect(positions.at(-1)).toEqual(expected)
  })

  it("is the cfi a navigation asked for while its item loads, final once the page holding it is laid out", async () => {
    const secondItem = holdItem("/page_1.jpg")
    const reader = createTestReader({ getRenderer: secondItem.getRenderer })

    mountTestReader(reader)
    await settledOn(reader, 0)

    const positions: ReadingPosition[] = []
    reader.navigation.readingPosition$.pipe(skip(1)).subscribe((position) => {
      positions.push(position)
    })

    const cfi = "epubcfi(/6/4[1]!/4/2)"
    const inSecondItem = (isFinal: boolean) => ({
      cfi,
      percentageEstimateOfBook: itemStartProgression(1),
      isFinal,
    })

    reader.navigation.goToCfi(cfi, { animate: false })

    /**
     * The page holding the cfi is not laid out yet: the progress is its item's
     * start, which it can be short of, and the value is not final.
     */
    expect(positions).toEqual([inSecondItem(false)])

    secondItem.release()
    await settledOn(reader, 1)

    /**
     * Its page found, the value is final, and emitted as such even though the
     * page is the item's first, where its progress already stood.
     */
    await vi.waitFor(() =>
      expect(positions).toEqual([inSecondItem(false), inSecondItem(true)]),
    )
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
      isFinal: false,
    })

    secondItem.release()
    const second = await settledOn(reader, 1)

    expect(await firstValueFrom(reader.navigation.readingPosition$)).toEqual({
      cfi: second.begin.cfi,
      percentageEstimateOfBook: itemStartProgression(1),
      isFinal: true,
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
      isFinal: true,
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

  it("is final once its navigation finds its page, and stays so until the next navigation", async () => {
    const secondItem = holdItem("/page_1.jpg")
    const reader = createTestReader({ getRenderer: secondItem.getRenderer })

    /** Every value, with the navigation it is the reading position of. */
    const values: { navigationId: symbol; position: ReadingPosition }[] = []
    reader.navigation.readingPosition$.subscribe((position) => {
      values.push({
        navigationId: reader.navigation.getNavigation().id,
        position,
      })
    })

    mountTestReader(reader)
    await settledOn(reader, 0)

    /**
     * Into an item still loading, back before it has loaded, into it again at
     * a cfi once it has, then laid out again and unloaded: restorations of a
     * navigation keep its id.
     */
    reader.navigation.goToSpineItem({ indexOrId: 1, animation: "turn" })
    await waitFor(50)
    reader.navigation.goToSpineItem({ indexOrId: 0, animation: false })
    secondItem.release()
    await settledOn(reader, 0)
    reader.navigation.goToCfi("epubcfi(/6/4[1]!/4/2)", { animate: false })
    await settledOn(reader, 1)
    reader.layout()
    await settledOn(reader, 1)
    reader.spineItemsManager.get(1)?.unload()
    await settledOn(reader, 1)

    const navigationIds = [
      ...new Set(values.map(({ navigationId }) => navigationId)),
    ]

    // The opening, the two into item 1 and the one back. The first into item
    // 1 went while it loaded, before its page could be found.
    expect(navigationIds.length).toBeGreaterThan(3)
    expect(values.map(({ position }) => position.isFinal)).toContain(false)

    for (const navigationId of navigationIds) {
      const positions = values
        .filter((value) => value.navigationId === navigationId)
        .map(({ position }) => position)
      const firstFinal = positions.findIndex(({ isFinal }) => isFinal)

      if (firstFinal === -1) continue

      // Once final, the value is the one saved: nothing moves it but the next
      // navigation.
      for (const position of positions.slice(firstFinal)) {
        expect(position).toEqual(positions[firstFinal])
      }
    }

    // The last navigation found its page.
    expect(values.at(-1)?.position.isFinal).toBe(true)
  })

  it("is final once an item without a document has loaded, for a selector into it", async () => {
    const secondItem = holdItem("/page_1.jpg")
    const reader = createTestReader({ getRenderer: secondItem.getRenderer })

    mountTestReader(reader)
    await settledOn(reader, 0)

    const positions: ReadingPosition[] = []
    reader.navigation.readingPosition$.pipe(skip(1)).subscribe((position) => {
      positions.push(position)
    })

    const item = reader.spineItemsManager.get(1)

    if (!item) throw new Error("item 1 is missing")

    /**
     * The test book's items are images, rendered without a document, as a url
     * or an xpointer can lead into. What a selector looks for is found once
     * its item's document is loaded, and while the item loads the navigation
     * waits for it.
     */
    reader.navigation.navigate({
      target: {
        type: "selector",
        value: { spineItem: 1, find: (document) => ({ node: document.body }) },
      },
      animation: false,
    })

    expect(positions).toEqual([
      {
        cfi: reader.cfi.generateRootCfi(item.item),
        percentageEstimateOfBook: itemStartProgression(1),
        isFinal: false,
      },
    ])

    secondItem.release()

    const settled = await settledOn(reader, 1)

    /**
     * Loaded, the item has no document, nor ever will: the reader stops
     * waiting for one, and the reading position is the page it landed on.
     */
    await vi.waitFor(() =>
      expect(positions.at(-1)).toEqual({
        cfi: settled.begin.cfi,
        percentageEstimateOfBook: itemStartProgression(1),
        isFinal: true,
      }),
    )
  })
})

describe("reading position and settled pagination", () => {
  type PlaceNamedByStream = {
    stream: "readingPosition" | "settledPagination"
    pageStartProgression: number
  }

  /**
   * The place each stream names, in the order they emit, as how far into the
   * book its page starts: the reading position's own progression, and the
   * start of each settled result's begin page. Both come from the same
   * estimate, so two pages of one item are told apart.
   */
  const recordPlacesNamedByReadingPositionAndSettledPagination = (
    reader: ReturnType<typeof createEnhancedTestReader>,
  ) => {
    const placesNamedInOrder: PlaceNamedByStream[] = []

    reader.navigation.readingPosition$.subscribe((readingPosition) => {
      placesNamedInOrder.push({
        stream: "readingPosition",
        pageStartProgression: readingPosition.percentageEstimateOfBook,
      })
    })
    reader.pagination.state$
      .pipe(filter((pagination) => pagination.isSettled))
      .subscribe(({ begin }) => {
        placesNamedInOrder.push({
          stream: "settledPagination",
          pageStartProgression: getPageStartProgression({
            manifest: reader.context.manifest,
            spineItemIndex: begin.spineItemIndex ?? 0,
            pageIndex: begin.pageIndexInSpineItem ?? 0,
            numberOfPages:
              reader.spineItemsManager.get(begin.spineItemIndex)
                ?.numberOfPages ?? 1,
          }),
        })
      })

    return placesNamedInOrder
  }

  /**
   * Once the reading position names the place a navigation goes to,
   * pagination's next settled result names it too, and none names the place
   * the navigation left.
   */
  const expectSettledPaginationToFollowTheReadingPosition = (
    placesNamedInOrder: PlaceNamedByStream[],
    { from, to }: { from: number; to: number },
  ) => {
    const readingPositionMovedAt = placesNamedInOrder.findIndex(
      ({ stream, pageStartProgression }) =>
        stream === "readingPosition" && pageStartProgression === to,
    )
    const firstSettledOnNewPlaceAt = placesNamedInOrder.findIndex(
      ({ stream, pageStartProgression }) =>
        stream === "settledPagination" && pageStartProgression === to,
    )
    const settledOnPlaceLeftAfterwards = placesNamedInOrder
      .slice(readingPositionMovedAt + 1)
      .filter(
        ({ stream, pageStartProgression }) =>
          stream === "settledPagination" && pageStartProgression === from,
      )

    expect(from).not.toBe(to)
    expect(readingPositionMovedAt).toBeGreaterThan(-1)
    expect(firstSettledOnNewPlaceAt).toBeGreaterThan(readingPositionMovedAt)
    expect(settledOnPlaceLeftAfterwards).toEqual([])
  }

  it.each([
    ["without animation", false],
    ["with a page turn", "turn"],
  ] as const)(
    "moves before pagination settles on a navigation's place, %s",
    async (_, animation) => {
      const reader = createEnhancedTestReader()

      mountTestReader(reader)
      await settledOn(reader, 0)

      const placesNamedInOrder =
        recordPlacesNamedByReadingPositionAndSettledPagination(reader)

      reader.navigation.goToSpineItem({ indexOrId: 1, animation })
      await settledOn(reader, 1)

      expectSettledPaginationToFollowTheReadingPosition(placesNamedInOrder, {
        from: itemStartProgression(0),
        to: itemStartProgression(1),
      })
    },
  )

  it("moves before pagination settles on a navigation's place, into an item still loading", async () => {
    const secondItem = holdItem("/page_1.jpg")
    const reader = createEnhancedTestReader({
      getRenderer: secondItem.getRenderer,
    })

    mountTestReader(reader)
    await settledOn(reader, 0)

    const placesNamedInOrder =
      recordPlacesNamedByReadingPositionAndSettledPagination(reader)

    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    await waitFor(100)
    secondItem.release()
    await settledOn(reader, 1)

    expectSettledPaginationToFollowTheReadingPosition(placesNamedInOrder, {
      from: itemStartProgression(0),
      to: itemStartProgression(1),
    })
  })

  it("moves before pagination settles on a navigation's place, when the book is laid out again before it loads", async () => {
    const secondItem = holdItem("/page_1.jpg")
    const reader = createEnhancedTestReader({
      getRenderer: secondItem.getRenderer,
    })

    mountTestReader(reader)
    await settledOn(reader, 0)

    const placesNamedInOrder =
      recordPlacesNamedByReadingPositionAndSettledPagination(reader)

    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    await waitFor(100)
    reader.layout()
    await waitFor(100)
    secondItem.release()
    await settledOn(reader, 1)

    expectSettledPaginationToFollowTheReadingPosition(placesNamedInOrder, {
      from: itemStartProgression(0),
      to: itemStartProgression(1),
    })
  })

  it("moves before pagination settles on a navigation's place, between pages of one item", async () => {
    /**
     * The first item lays out three pages wide, as a reflowable chapter
     * would, so a navigation can stay within it.
     */
    class ThreePagesWideRenderer extends DocumentRenderer {
      onUnload() {}

      onCreateDocument() {
        return of(this.context.document.createElement("div"))
      }

      onLoadDocument() {
        return EMPTY
      }

      onLayout() {
        const { width, height } = this.viewport.pageSize

        return of({ width: width * 3, height })
      }

      onRenderHeadless() {
        return EMPTY
      }

      getDocumentFrame() {
        return undefined
      }
    }
    const reader = createEnhancedTestReader({
      manifest: createTestManifest({
        renditionLayout: "reflowable",
        spineItems: [0, 1].map((index) => ({
          href: `/chapter_${index}.xhtml`,
          id: `${index}`,
          index,
          progressionWeight: 0.5,
          renditionLayout: "reflowable",
        })),
      }),
      getRenderer: (item) => (props) =>
        item.index === 0
          ? new ThreePagesWideRenderer(props)
          : new DefaultRenderer(props),
    })

    mountTestReader(reader)
    await settledOn(reader, 0)

    const placesNamedInOrder =
      recordPlacesNamedByReadingPositionAndSettledPagination(reader)

    reader.navigation.goToPageOfSpineItem({
      spineItemId: 0,
      pageIndex: 2,
      animation: false,
    })
    await firstValueFrom(
      reader.pagination.state$.pipe(
        filter(
          (pagination) =>
            pagination.isSettled && pagination.begin.pageIndexInSpineItem === 2,
        ),
      ),
    )

    expectSettledPaginationToFollowTheReadingPosition(placesNamedInOrder, {
      from: 0,
      to: getPageStartProgression({
        manifest: reader.context.manifest,
        spineItemIndex: 0,
        pageIndex: 2,
        numberOfPages: 3,
      }),
    })
  })

  it("moves before pagination settles again, when a navigation keeps the pages shown", async () => {
    /**
     * In landscape the spread holding item 1 starts at item 0, so a cfi into
     * item 1 moves the reading position without changing the pages shown.
     * Pagination settles again all the same, on the spread it had settled on,
     * so the latest value is pagination's once more.
     */
    setTestViewport({ width: 200, height: 100 })
    const reader = createEnhancedTestReader()

    mountTestReader(reader)
    await settledOn(reader, 0)

    const placesNamedInOrder =
      recordPlacesNamedByReadingPositionAndSettledPagination(reader)

    reader.navigation.goToCfi("epubcfi(/6/4[1]!/4/2)", { animate: false })
    await settledOn(reader, 0)

    expect(placesNamedInOrder).toEqual([
      {
        stream: "readingPosition",
        pageStartProgression: itemStartProgression(0),
      },
      {
        stream: "settledPagination",
        pageStartProgression: itemStartProgression(0),
      },
      {
        stream: "readingPosition",
        pageStartProgression: itemStartProgression(1),
      },
      {
        stream: "settledPagination",
        pageStartProgression: itemStartProgression(0),
      },
    ])
  })
})
