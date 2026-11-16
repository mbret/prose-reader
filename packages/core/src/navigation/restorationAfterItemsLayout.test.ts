// @vitest-environment jsdom
import { first, firstValueFrom, withLatestFrom } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import {
  createPrePaginatedManifest,
  createTestReader,
  defaultTestViewport,
  deliverScrollEvent,
  holdItemDocumentLoadHooks,
  installReaderTestEnvironment,
  mountTestReader,
  notifyResize,
  renderItemsOfSetSizes,
  renderTextDocumentsWithParagraphOnSetPage,
  setTestViewport,
  settledOn,
  stubElementScrolling,
} from "../tests/readerHarness"
import {
  createTestManifest,
  createTestManifestSpineItems,
} from "../tests/utils"

installReaderTestEnvironment()

/**
 * A book of four pages, one item each, opened on its third page, whose first
 * page a test can make larger, as a spine item that loads before the one on
 * screen does. Every page after it then moves by as much at the next layout.
 */
const openOnThirdPage = async (
  options: Parameters<typeof createTestReader>[0] = {},
) => {
  stubElementScrolling()

  const {
    getRenderer,
    setItemSize,
    holdLayoutOfItem,
    getNumberOfLayoutsStartedOfItem,
  } = renderItemsOfSetSizes()
  const reader = createTestReader({
    manifest: createPrePaginatedManifest({
      pageSpreads: [undefined, undefined, undefined, undefined],
    }),
    getRenderer,
    ...options,
  })

  mountTestReader(reader)
  await settledOn(reader, 0)
  reader.navigation.goToSpineItem({ indexOrId: 2, animation: false })
  await settledOn(reader, 2)

  return {
    reader,
    setItemSize,
    setSizeOfFirstPage: (size: Parameters<typeof setItemSize>[1]) =>
      setItemSize(0, size),
    holdLayoutOfItem,
    getNumberOfLayoutsStartedOfItem,
  }
}

describe("Given a layout that moves the spine item the navigation shows", () => {
  describe("When the pages turn", () => {
    it("restores the navigation in the task that lays the spine items out, before the pages are published", async () => {
      const { reader, setSizeOfFirstPage } = await openOnThirdPage()
      const { width: pageWidth } = defaultTestViewport

      expect(reader.navigation.getNavigation().position.x).toBe(2 * pageWidth)

      // The first page becomes two pages wide: the third one moves by a page.
      setSizeOfFirstPage({ width: 2 * pageWidth })
      reader.layout()
      await firstValueFrom(reader.spine.itemsLayout$)

      expect(reader.spine.isLayoutCurrent()).toBe(false)
      expect(reader.navigation.getNavigation()).toMatchObject({
        position: { x: 3 * pageWidth, y: 0 },
        spineItem: 2,
      })

      // The restoration that follows the pages leaves it there.
      await settledOn(reader, 2)

      expect(reader.navigation.getNavigation().position.x).toBe(3 * pageWidth)
    })
  })

  describe("When the pages turn, and the navigation is locked", () => {
    it("restores the navigation once the lock is released", async () => {
      const { reader, setSizeOfFirstPage } = await openOnThirdPage()
      const { width: pageWidth } = defaultTestViewport
      const release = reader.navigation.lock()

      // The first page becomes two pages wide: the third one moves by a page.
      setSizeOfFirstPage({ width: 2 * pageWidth })
      reader.layout()
      await firstValueFrom(reader.spine.layout$)

      // The position is the lock holder's until the release.
      expect(reader.navigation.getNavigation().position.x).toBe(2 * pageWidth)

      release()
      await settledOn(reader, 2)

      expect(reader.navigation.getNavigation().position.x).toBe(3 * pageWidth)
    })
  })

  describe("When the book scrolls", () => {
    it("restores the navigation in the task that lays the spine items out, before the pages are published", async () => {
      const { reader, setSizeOfFirstPage } = await openOnThirdPage({
        pageTurnMode: "scrollable",
      })
      const { height: pageHeight } = defaultTestViewport
      const scrollElement =
        reader.navigation.scrollNavigationController.value.element

      expect(scrollElement?.scrollTop).toBe(2 * pageHeight)

      // The first page grows by 300: the third one moves down by as much.
      setSizeOfFirstPage({ height: pageHeight + 300 })
      reader.layout()
      await firstValueFrom(reader.spine.itemsLayout$)

      expect(reader.spine.isLayoutCurrent()).toBe(false)
      expect(scrollElement?.scrollTop).toBe(2 * pageHeight + 300)
      expect(reader.navigation.getNavigation()).toMatchObject({
        position: { x: 0, y: 2 * pageHeight + 300 },
        spineItem: 2,
      })

      await settledOn(reader, 2)

      expect(scrollElement?.scrollTop).toBe(2 * pageHeight + 300)
    })
  })

  describe("When the book scrolls, and the user is scrolling", () => {
    const { height: pageHeight } = defaultTestViewport
    const distanceUserScrolledIntoThirdPage = 50

    const openOnThirdPageOfScrollingBook = async () => {
      const { reader, ...sizesAndLayoutOfSpineItems } = await openOnThirdPage({
        pageTurnMode: "scrollable",
      })
      const scrollElement =
        reader.navigation.scrollNavigationController.value.element

      if (!scrollElement) throw new Error("the reader has no scroll element")

      return {
        reader,
        scrollElement,
        ...sizesAndLayoutOfSpineItems,
        isNavigationLocked: () => firstValueFrom(reader.navigation.isLocked$),
      }
    }

    it("restores the navigation where the user scrolled to, while the scroll is still in progress", async () => {
      const { reader, scrollElement, setSizeOfFirstPage, isNavigationLocked } =
        await openOnThirdPageOfScrollingBook()

      scrollElement.scrollTop =
        2 * pageHeight + distanceUserScrolledIntoThirdPage
      deliverScrollEvent(scrollElement)

      // The first page grows by 300: the third one moves down by as much.
      setSizeOfFirstPage({ height: pageHeight + 300 })
      reader.layout()
      await firstValueFrom(reader.spine.itemsLayout$)

      expect(await isNavigationLocked()).toBe(true)
      expect(scrollElement.scrollTop).toBe(
        2 * pageHeight + 300 + distanceUserScrolledIntoThirdPage,
      )
      expect(reader.navigation.getNavigation()).toMatchObject({
        position: {
          x: 0,
          y: 2 * pageHeight + 300 + distanceUserScrolledIntoThirdPage,
        },
        spineItem: 2,
      })

      // The scroll ends where the reader left the book.
      await settledOn(reader, 2)

      expect(await isNavigationLocked()).toBe(false)
      expect(scrollElement.scrollTop).toBe(
        2 * pageHeight + 300 + distanceUserScrolledIntoThirdPage,
      )
    })

    it("leaves the book where the user scrolls on, between the items layout and the pages", async () => {
      const { reader, scrollElement, setSizeOfFirstPage } =
        await openOnThirdPageOfScrollingBook()
      const scrollTopAfterItemsLayout =
        2 * pageHeight + 300 + distanceUserScrolledIntoThirdPage

      scrollElement.scrollTop =
        2 * pageHeight + distanceUserScrolledIntoThirdPage
      deliverScrollEvent(scrollElement)

      setSizeOfFirstPage({ height: pageHeight + 300 })
      reader.layout()
      await firstValueFrom(reader.spine.itemsLayout$)

      expect(scrollElement.scrollTop).toBe(scrollTopAfterItemsLayout)

      // The pages come some frames later: the user scrolls on meanwhile.
      scrollElement.scrollTop = scrollTopAfterItemsLayout + 40
      deliverScrollEvent(scrollElement)
      await firstValueFrom(reader.spine.layout$)

      expect(scrollElement.scrollTop).toBe(scrollTopAfterItemsLayout + 40)

      await settledOn(reader, 2)

      expect(scrollElement.scrollTop).toBe(scrollTopAfterItemsLayout + 40)
    })

    it("restores the navigation where the user scrolled to, when the browser has not reported the last move as the layout starts", async () => {
      const { reader, scrollElement, setSizeOfFirstPage } =
        await openOnThirdPageOfScrollingBook()

      scrollElement.scrollTop = 2 * pageHeight + 10
      deliverScrollEvent(scrollElement)
      // A browser reports a move a frame or more after it happens.
      scrollElement.scrollTop =
        2 * pageHeight + distanceUserScrolledIntoThirdPage

      setSizeOfFirstPage({ height: pageHeight + 300 })
      reader.layout()
      await firstValueFrom(reader.spine.itemsLayout$)

      expect(scrollElement.scrollTop).toBe(
        2 * pageHeight + 300 + distanceUserScrolledIntoThirdPage,
      )

      // The event of that move comes after the reader moved the book.
      deliverScrollEvent(scrollElement)
      await settledOn(reader, 2)

      expect(scrollElement.scrollTop).toBe(
        2 * pageHeight + 300 + distanceUserScrolledIntoThirdPage,
      )
    })

    it("restores the navigation where the user scrolled to, when the layout starts again after the reader's container was hidden", async () => {
      const { reader, scrollElement, setSizeOfFirstPage } =
        await openOnThirdPageOfScrollingBook()

      scrollElement.scrollTop =
        2 * pageHeight + distanceUserScrolledIntoThirdPage
      deliverScrollEvent(scrollElement)

      /**
       * Hidden as the layout starts, the container measures 0 by 0, and the
       * layout stops. A browser takes the element's box away, and its offsets
       * with it. jsdom keeps them, so the test resets them.
       */
      reader.spine.itemsLayoutStart$.pipe(first()).subscribe(() => {
        setTestViewport({ width: 0, height: 0 })
        notifyResize()
        scrollElement.scrollTop = 0
      })

      setSizeOfFirstPage({ height: pageHeight + 300 })
      reader.layout()
      await firstValueFrom(reader.spine.itemsLayoutStart$)

      // Shown again, the pass starts again: it measures, waits, then lays out.
      const itemsLaidOut = firstValueFrom(reader.spine.itemsLayout$)

      setTestViewport(defaultTestViewport)
      notifyResize()
      await itemsLaidOut

      expect(scrollElement.scrollTop).toBe(
        2 * pageHeight + 300 + distanceUserScrolledIntoThirdPage,
      )
    })

    it("lays the spine out for a spine item that finished loading once the scroll is over, and restores the navigation where the user scrolled to", async () => {
      const { reader, scrollElement, setSizeOfFirstPage, isNavigationLocked } =
        await openOnThirdPageOfScrollingBook()
      const firstPage = reader.spineItemsManager.get(0)

      if (!firstPage) throw new Error("the book has no first page")

      /**
       * The first page loads again, as one the reader had released, and waits
       * at the end of that load, as behind a slow hook.
       */
      const loadOfFirstPage = holdItemDocumentLoadHooks(
        reader,
        firstPage.item.id,
      )

      firstPage.unload()
      await vi.waitFor(() => {
        expect(firstPage.value.loadStatus).toBe("loading")
        expect(reader.spine.isLayoutCurrent()).toBe(true)
      })

      const wasNavigationLockedAsEachLayoutStarted: boolean[] = []

      reader.spine.itemsLayoutStart$
        .pipe(withLatestFrom(reader.navigation.isLocked$))
        .subscribe(([, isLocked]) => {
          wasNavigationLockedAsEachLayoutStarted.push(isLocked)
        })

      scrollElement.scrollTop =
        2 * pageHeight + distanceUserScrolledIntoThirdPage
      deliverScrollEvent(scrollElement)

      const spineItemsLaidOut = firstValueFrom(reader.spine.itemsLayout$)

      // Loaded, the first page is taller by 300: the third one moves down.
      setSizeOfFirstPage({ height: pageHeight + 300 })
      loadOfFirstPage.release()
      await vi.waitFor(() => expect(firstPage.value.loadStatus).toBe("loaded"))

      expect(await isNavigationLocked()).toBe(true)

      await spineItemsLaidOut

      expect(
        wasNavigationLockedAsEachLayoutStarted,
        "whether the user was scrolling as each layout started",
      ).toEqual([false])
      expect(scrollElement.scrollTop).toBe(
        2 * pageHeight + 300 + distanceUserScrolledIntoThirdPage,
      )
      expect(reader.navigation.getNavigation()).toMatchObject({
        position: {
          x: 0,
          y: 2 * pageHeight + 300 + distanceUserScrolledIntoThirdPage,
        },
        spineItem: 2,
      })
    })

    it("restores the navigation where the last move took the book, when the user scrolls on while the spine items are laid out", async () => {
      const {
        reader,
        scrollElement,
        setSizeOfFirstPage,
        holdLayoutOfItem,
        getNumberOfLayoutsStartedOfItem,
      } = await openOnThirdPageOfScrollingBook()

      scrollElement.scrollTop =
        2 * pageHeight + distanceUserScrolledIntoThirdPage
      deliverScrollEvent(scrollElement)

      // The first page grows by 300, and the pass waits at the second page.
      const numberOfLayoutsOfSecondPageBeforePass =
        getNumberOfLayoutsStartedOfItem(1)
      const releaseLayoutOfSecondPage = holdLayoutOfItem(1)

      setSizeOfFirstPage({ height: pageHeight + 300 })
      reader.layout()
      await vi.waitFor(() =>
        expect(getNumberOfLayoutsStartedOfItem(1)).toBe(
          numberOfLayoutsOfSecondPageBeforePass + 1,
        ),
      )

      // The user scrolls on by 10 while the third page has not moved yet.
      scrollElement.scrollTop =
        2 * pageHeight + distanceUserScrolledIntoThirdPage + 10
      deliverScrollEvent(scrollElement)

      const spineItemsLaidOut = firstValueFrom(reader.spine.itemsLayout$)

      releaseLayoutOfSecondPage()
      await spineItemsLaidOut

      expect(scrollElement.scrollTop, "where the book is").toBe(
        2 * pageHeight + 300 + distanceUserScrolledIntoThirdPage + 10,
      )
    })

    it("restores the navigation where the user scrolled to, and goes on with the scroll, when the scroll begins as the layout has started", async () => {
      const { reader, scrollElement, setSizeOfFirstPage, isNavigationLocked } =
        await openOnThirdPageOfScrollingBook()

      /**
       * The scroll begins as the layout has started: it navigates at no
       * start of a layout, so the reader restores the navigation that the
       * first move of the scroll made.
       */
      reader.spine.itemsLayoutStart$.pipe(first()).subscribe(() => {
        scrollElement.scrollTop =
          2 * pageHeight + distanceUserScrolledIntoThirdPage
        deliverScrollEvent(scrollElement)
      })

      const restorations: string[] = []

      reader.navigation.navigation$.subscribe(({ triggeredBy }) => {
        if (triggeredBy === "restoration")
          restorations.push(reader.navigation.getNavigation().type)
      })

      // The first page grows by 300: the third one moves down by as much.
      setSizeOfFirstPage({ height: pageHeight + 300 })
      reader.layout()
      await firstValueFrom(reader.spine.itemsLayout$)

      expect(scrollElement.scrollTop, "where the book is").toBe(
        2 * pageHeight + 300 + distanceUserScrolledIntoThirdPage,
      )
      expect(restorations, "the type of each restoration").toEqual(["scroll"])
      expect(
        await isNavigationLocked(),
        "whether the scroll holds the lock, after the restoration",
      ).toBe(true)
    })

    it("keeps the reader on that spine item when the page turn mode becomes controlled before the scroll is over", async () => {
      const { reader, scrollElement, setSizeOfFirstPage, isNavigationLocked } =
        await openOnThirdPageOfScrollingBook()

      // To the top of the third page, where the second one is after the layout.
      scrollElement.scrollTop = 2 * pageHeight + 1
      deliverScrollEvent(scrollElement)
      scrollElement.scrollTop = 2 * pageHeight
      deliverScrollEvent(scrollElement)

      // The first page becomes two pages tall: the third one moves by a page.
      setSizeOfFirstPage({ height: 2 * pageHeight })
      reader.layout()
      await firstValueFrom(reader.spine.itemsLayout$)

      expect(scrollElement.scrollTop).toBe(3 * pageHeight)

      /**
       * A browser takes the element's box away with the mode, and its
       * offsets with it. jsdom keeps them, so the test resets them.
       */
      scrollElement.scrollTop = 0
      reader.settings.update({ pageTurnMode: "controlled" })

      expect(await isNavigationLocked()).toBe(false)

      // Polled rather than awaited, so that a failure names the page.
      await vi.waitFor(
        () =>
          expect(reader.pagination.state).toMatchObject({
            isSettled: true,
            begin: { spineItemIndex: 2 },
          }),
        { timeout: 2000 },
      )
      expect(reader.navigation.getNavigation().spineItem).toBe(2)
    })
  })

  describe("When the book scrolls, and the app holds the navigation", () => {
    it("keeps the reader on its spine item when the pages turned until the lock was held", async () => {
      const { reader } = await openOnThirdPage()
      const { height: pageHeight } = defaultTestViewport
      const scrollElement =
        reader.navigation.scrollNavigationController.value.element
      const release = reader.navigation.lock()

      // The scroll element gets its box with the mode, at the top of the book.
      reader.settings.update({ pageTurnMode: "scrollable" })
      await firstValueFrom(reader.spine.layout$)
      release()
      await settledOn(reader, 2)

      expect(reader.navigation.getNavigation().spineItem).toBe(2)
      expect(scrollElement?.scrollTop).toBe(2 * pageHeight)
    })

    it("restores the navigation without waiting for the release", async () => {
      const { reader, setSizeOfFirstPage } = await openOnThirdPage({
        pageTurnMode: "scrollable",
      })
      const { height: pageHeight } = defaultTestViewport
      const scrollElement =
        reader.navigation.scrollNavigationController.value.element
      const release = reader.navigation.lock()

      setSizeOfFirstPage({ height: pageHeight + 300 })
      reader.layout()
      await firstValueFrom(reader.spine.itemsLayout$)

      expect(scrollElement?.scrollTop).toBe(2 * pageHeight + 300)

      release()
      await settledOn(reader, 2)

      expect(scrollElement?.scrollTop).toBe(2 * pageHeight + 300)
    })
  })
})

describe("Given a layout that keeps the place and size of the spine item the navigation shows, and moves its text to another page", () => {
  it("restores the navigation in the task that lays the spine items out, before the pages are published", async () => {
    const { getRenderer, setPageIndexOfParagraph } =
      renderTextDocumentsWithParagraphOnSetPage()
    const { width: pageWidth } = defaultTestViewport

    /**
     * A book of two chapters, three pages each, opened on the paragraph of
     * the second one, which is on that chapter's second page.
     */
    setPageIndexOfParagraph(1)

    const reader = createTestReader({
      manifest: createTestManifest({
        spineItems: createTestManifestSpineItems(2),
      }),
      getRenderer,
      target: { type: "cfi", value: "epubcfi(/6/4[item-1]!/4/2/1:0)" },
    })

    mountTestReader(reader)
    await settledOn(reader, 1)

    const getPlaceAndSizeOfSecondChapter = () =>
      reader.spine.getSpineItemSpineLayoutInfo(1)
    const placeAndSizeOfSecondChapterBeforeLayout =
      getPlaceAndSizeOfSecondChapter()

    expect(reader.navigation.getNavigation().position.x).toBe(4 * pageWidth)

    // The text moves by a page, as with a larger font that keeps the page count.
    setPageIndexOfParagraph(2)
    reader.layout()
    await firstValueFrom(reader.spine.itemsLayout$)

    expect(reader.spine.isLayoutCurrent()).toBe(false)
    expect(getPlaceAndSizeOfSecondChapter()).toEqual(
      placeAndSizeOfSecondChapterBeforeLayout,
    )
    expect(reader.navigation.getNavigation().position.x).toBe(5 * pageWidth)

    // The restoration that follows the pages leaves it there.
    await settledOn(reader, 1)

    expect(reader.navigation.getNavigation().position.x).toBe(5 * pageWidth)
  })
})

describe("Given a spine item of a book that scrolls, which changes height once a scroll of the user's is over", () => {
  const { height: pageHeight } = defaultTestViewport

  /**
   * A book of four pages, one item each, that scrolls. The user scrolls from
   * one page into the third one, then moves a pixel the other way, and the
   * scroll ends. The third page then grows by 300 where it is.
   */
  const scrollIntoThirdPageThenMakeItTaller = async ({
    fromPage,
    toDistanceIntoThirdPage,
    thenByOnePixel,
  }: {
    fromPage: number
    toDistanceIntoThirdPage: number
    thenByOnePixel: "down" | "up"
  }) => {
    stubElementScrolling()

    const { getRenderer, setItemSize } = renderItemsOfSetSizes()
    const reader = createTestReader({
      manifest: createPrePaginatedManifest({
        pageSpreads: [undefined, undefined, undefined, undefined],
      }),
      getRenderer,
      pageTurnMode: "scrollable",
    })

    mountTestReader(reader)
    await settledOn(reader, 0)
    reader.navigation.goToSpineItem({ indexOrId: fromPage, animation: false })
    await settledOn(reader, fromPage)

    const scrollElement =
      reader.navigation.scrollNavigationController.value.element

    if (!scrollElement) throw new Error("the reader has no scroll element")

    const scrollTopAtEndOfScroll =
      2 * pageHeight +
      toDistanceIntoThirdPage +
      (thenByOnePixel === "down" ? 1 : -1)

    scrollElement.scrollTop = 2 * pageHeight + toDistanceIntoThirdPage
    deliverScrollEvent(scrollElement)
    scrollElement.scrollTop = scrollTopAtEndOfScroll
    deliverScrollEvent(scrollElement)
    await settledOn(reader, 2)

    setItemSize(2, { height: pageHeight + 300 })
    reader.layout()
    await firstValueFrom(reader.spine.itemsLayout$)

    return { scrollElement, scrollTopAtEndOfScroll }
  }

  describe("When the user came into it from the spine item after it, and the last move went a pixel down", () => {
    it("keeps the book as far from the bottom of the spine item", async () => {
      const { scrollElement, scrollTopAtEndOfScroll } =
        await scrollIntoThirdPageThenMakeItTaller({
          fromPage: 3,
          toDistanceIntoThirdPage: 70,
          thenByOnePixel: "down",
        })

      expect(scrollElement.scrollTop).toBe(scrollTopAtEndOfScroll + 300)
    })
  })

  describe("When the user came into it from the spine item before it, and the last move went a pixel up", () => {
    it("keeps the book as far from the top of the spine item", async () => {
      const { scrollElement, scrollTopAtEndOfScroll } =
        await scrollIntoThirdPageThenMakeItTaller({
          fromPage: 1,
          toDistanceIntoThirdPage: 50,
          thenByOnePixel: "up",
        })

      expect(scrollElement.scrollTop).toBe(scrollTopAtEndOfScroll)
    })
  })
})
