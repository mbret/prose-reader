// @vitest-environment jsdom
import { first, firstValueFrom, skip } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import { SpinePosition } from "../spine/types"
import {
  createPrePaginatedManifest,
  createTestReader,
  defaultTestViewport,
  deliverScrollEvent,
  holdItemLayout,
  installReaderTestEnvironment,
  mountTestReader,
  notifyResize,
  renderItemsOfSetHeights,
  setTestViewport,
  settledOn,
  stubElementScrolling,
} from "../tests/readerHarness"
import { waitFor } from "../tests/utils"
import type { Navigation } from "./types"

installReaderTestEnvironment()

/**
 * Long enough for a scroll of the user's to be over, and navigated to: it is
 * over 500 ms after its last event (`SCROLL_FINISHED_DEBOUNCE_TIMEOUT`).
 */
const PAST_THE_END_OF_A_USER_SCROLL = 700

type TestReader = ReturnType<typeof createTestReader>

const topOfPage = (pageIndex: number) => pageIndex * defaultTestViewport.height

/**
 * What a page gains when a test makes it grow, as a spine item that loads
 * above the screen does: every page after it moves down by as much.
 */
const HEIGHT_GAINED_BY_PAGE_THAT_GROWS = 300

/**
 * A book that scrolls, opened on one of its four pages, whose pages a test
 * can make grow. A page takes its new height at the next layout. The layout
 * of the last page can be held: a pass then lays out the first three pages,
 * and waits.
 */
const openOnPageOfBookWhosePagesCanGrow = async (pageIndex: number) => {
  const { Renderer, setItemHeight } = renderItemsOfSetHeights()
  const layoutOfLastPage = holdItemLayout("/page_3.jpg", Renderer)
  const { reader, scrollElement } = await openOnPage(pageIndex, {
    pageTurnMode: "scrollable",
    getRenderer: layoutOfLastPage.getRenderer,
  })

  return {
    reader,
    scrollElement,
    growPage: (pageIndexToGrow: number) => {
      setItemHeight(
        pageIndexToGrow,
        defaultTestViewport.height + HEIGHT_GAINED_BY_PAGE_THAT_GROWS,
      )
    },
    holdLayoutOfLastPage: layoutOfLastPage.hold,
    releaseLayoutOfLastPage: layoutOfLastPage.release,
  }
}

/**
 * Mounts a book of four pages, one item each, on one of them, with element
 * scrolling stubbed. The pages are stacked a viewport apart once they scroll.
 */
const openOnPage = async (
  pageIndex: number,
  options: Parameters<typeof createTestReader>[0] = {},
) => {
  const { scrollToCalls } = stubElementScrolling()
  const reader = createTestReader({
    manifest: createPrePaginatedManifest({
      pageSpreads: [undefined, undefined, undefined, undefined],
    }),
    ...options,
  })

  mountTestReader(reader)
  await settledOn(reader, 0)

  if (pageIndex > 0) {
    reader.navigation.goToSpineItem({ indexOrId: pageIndex, animation: false })
    await settledOn(reader, pageIndex)
  }

  const { element: scrollElement } =
    reader.navigation.scrollNavigationController.value

  if (!scrollElement) throw new Error("the reader has no scroll element")

  return { reader, scrollElement, scrollToCalls }
}

/** Scrolls the element as a user does: the reader only hears of the event. */
const scrollAsUser = (scrollElement: HTMLElement, scrollTop: number) => {
  scrollElement.scrollTop = scrollTop
  deliverScrollEvent(scrollElement)
}

const recordNavigationsAndLock = (reader: TestReader) => {
  const navigations: Navigation[] = []
  const lockStates: boolean[] = []

  // The first one is the latest navigation, replayed.
  reader.navigation.navigation$.pipe(skip(1)).subscribe((navigation) => {
    navigations.push(navigation)
  })
  reader.navigation.isLocked$.subscribe((isLocked) => {
    lockStates.push(isLocked)
  })

  return {
    userNavigations: () =>
      navigations.filter(({ triggeredBy }) => triggeredBy === "user"),
    hasLockBeenHeld: () => lockStates.includes(true),
    isLockHeld: () => lockStates.at(-1) === true,
  }
}

const recordScrollsNotMadeByReader = (reader: TestReader) => {
  const scrollsNotMadeByReader: { x: number; y: number }[] = []

  reader.navigation.scrollNavigationController.scrollNotMadeByReader$.subscribe(
    ({ x, y }) => {
      scrollsNotMadeByReader.push({ x, y })
    },
  )

  return scrollsNotMadeByReader
}

describe("Given a book that scrolls", () => {
  describe("When the reader scrolls to a navigation", () => {
    it("does not take the scroll event that follows for the user's, however late it comes", async () => {
      const { reader, scrollElement } = await openOnPage(2, {
        pageTurnMode: "scrollable",
      })

      expect(scrollElement.scrollTop).toBe(topOfPage(2))

      const { userNavigations, hasLockBeenHeld } =
        recordNavigationsAndLock(reader)

      // A browser reports the scroll at a later frame, not within the call.
      await waitFor(20)
      deliverScrollEvent(scrollElement)
      await waitFor(PAST_THE_END_OF_A_USER_SCROLL)

      expect(hasLockBeenHeld()).toBe(false)
      expect(userNavigations()).toHaveLength(0)
      expect(reader.navigation.getNavigation().spineItem).toBe(2)
    })
  })

  describe("When the reader navigates to where the browser already moved the element", () => {
    it("does not take the scroll event the browser reports afterwards for the user's", async () => {
      const { reader, scrollElement } = await openOnPage(2, {
        pageTurnMode: "scrollable",
      })
      const { hasLockBeenHeld } = recordNavigationsAndLock(reader)

      // The browser moves the element, and reports it a frame later.
      scrollElement.scrollTop = topOfPage(1)

      // The reader finds the element where it goes, and does not scroll it.
      reader.navigation.navigate({
        target: {
          type: "position",
          value: new SpinePosition({ x: 0, y: topOfPage(1) }),
        },
        animation: false,
      })
      deliverScrollEvent(scrollElement)

      expect(hasLockBeenHeld()).toBe(false)
    })
  })

  describe("When the element scrolls to where the reader did not put it", () => {
    it("takes the scroll for the user's, and navigates to where it stops", async () => {
      const { reader, scrollElement } = await openOnPage(0, {
        pageTurnMode: "scrollable",
      })
      const { userNavigations, hasLockBeenHeld } =
        recordNavigationsAndLock(reader)

      scrollAsUser(scrollElement, topOfPage(1))

      expect(hasLockBeenHeld()).toBe(true)

      await settledOn(reader, 1)

      expect(userNavigations().at(-1)?.position).toMatchObject({
        x: 0,
        y: topOfPage(1),
      })
    })

    it("does not take a second event at the same offsets for another scroll", async () => {
      const { reader, scrollElement } = await openOnPage(0, {
        pageTurnMode: "scrollable",
      })
      const scrollsNotMadeByReader = recordScrollsNotMadeByReader(reader)

      scrollAsUser(scrollElement, topOfPage(1))
      deliverScrollEvent(scrollElement)

      expect(scrollsNotMadeByReader).toEqual([{ x: 0, y: topOfPage(1) }])
    })

    it("does not take offsets a fraction of a pixel from where the reader left the element for a scroll", async () => {
      const { reader, scrollElement } = await openOnPage(0, {
        pageTurnMode: "scrollable",
      })
      const scrollsNotMadeByReader = recordScrollsNotMadeByReader(reader)

      scrollAsUser(scrollElement, 0.4)

      expect(scrollsNotMadeByReader).toHaveLength(0)

      scrollAsUser(scrollElement, 1)

      expect(scrollsNotMadeByReader).toHaveLength(1)
    })

    it("takes a scroll of less than a pixel at a time for the user's once it adds up to a pixel", async () => {
      const { reader, scrollElement } = await openOnPage(0, {
        pageTurnMode: "scrollable",
      })
      const scrollsNotMadeByReader = recordScrollsNotMadeByReader(reader)

      for (const scrollTop of [0.4, 0.8, 1.2, 1.6]) {
        scrollAsUser(scrollElement, scrollTop)
      }

      // at 1.2, a pixel or more from where the reader left the element
      expect(scrollsNotMadeByReader).toHaveLength(1)
    })
  })

  describe("When the page turn mode becomes controlled while the user scrolls", () => {
    it("ends the scroll at once, on the page the user scrolled to", async () => {
      const { reader, scrollElement } = await openOnPage(0, {
        pageTurnMode: "scrollable",
      })
      const { isLockHeld } = recordNavigationsAndLock(reader)

      scrollAsUser(scrollElement, topOfPage(2))

      expect(isLockHeld()).toBe(true)

      /**
       * A browser takes the element's box away with the mode, and its
       * offsets with it: they no longer say where the user is. jsdom keeps
       * them, so the test resets them.
       */
      scrollElement.scrollTop = 0
      reader.settings.update({ pageTurnMode: "controlled" })

      expect(isLockHeld()).toBe(false)

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

  describe("When a layout leaves less to scroll than the element had scrolled", () => {
    it("does not take the scroll the browser clamps the element to for the user's", async () => {
      const { reader, scrollElement } = await openOnPage(2, {
        pageTurnMode: "scrollable",
      })
      const { userNavigations, hasLockBeenHeld } =
        recordNavigationsAndLock(reader)

      /**
       * A browser clamps the offsets while the items are laid out, and
       * reports that scroll at a later frame: here once the items are laid
       * out, before their pages are published and the navigation restored.
       */
      reader.hookManager.register("item.onAfterLayout", () => {
        scrollElement.scrollTop = topOfPage(1)
      })
      reader.spine.itemsLayout$.pipe(first()).subscribe(() => {
        deliverScrollEvent(scrollElement)
      })

      reader.layout()
      await firstValueFrom(reader.spine.layout$)

      expect(hasLockBeenHeld()).toBe(false)

      await settledOn(reader, 2)

      expect(userNavigations()).toHaveLength(0)
      // the restoration put the page back
      expect(scrollElement.scrollTop).toBe(topOfPage(2))
    })
  })

  describe("When a layout moves the spine item at the top of the screen", () => {
    it("scrolls by as much in the task that lays the items out, and does not take that scroll for the user's", async () => {
      const { reader, scrollElement, growPage } =
        await openOnPageOfBookWhosePagesCanGrow(2)
      const { userNavigations, hasLockBeenHeld } =
        recordNavigationsAndLock(reader)

      growPage(0)
      reader.layout()
      await firstValueFrom(reader.spine.itemsLayout$)

      /**
       * The items are laid out, and their pages not published yet: the
       * navigation is only restored onto them later, frames later in a
       * browser.
       */
      expect(reader.spine.isLayoutCurrent()).toBe(false)
      expect(scrollElement.scrollTop).toBe(
        topOfPage(2) + HEIGHT_GAINED_BY_PAGE_THAT_GROWS,
      )

      // A browser reports the scroll at a later frame.
      await waitFor(20)
      deliverScrollEvent(scrollElement)
      await waitFor(PAST_THE_END_OF_A_USER_SCROLL)

      expect(hasLockBeenHeld()).toBe(false)
      expect(userNavigations()).toHaveLength(0)
      expect(reader.navigation.getNavigation().spineItem).toBe(2)
      expect(scrollElement.scrollTop).toBe(
        topOfPage(2) + HEIGHT_GAINED_BY_PAGE_THAT_GROWS,
      )
    })

    it("takes a spine item that starts a fraction of a pixel past the top of the screen for the one there", async () => {
      const { reader, scrollElement, growPage } =
        await openOnPageOfBookWhosePagesCanGrow(2)

      /**
       * A browser that keeps whole pixels of an offset leaves the element
       * short of a top that falls between two of them.
       */
      const placeShortOfTopOfPage = topOfPage(2) - 0.5

      scrollElement.scrollTop = placeShortOfTopOfPage

      // The page before grows: it stays where it is, and the one after moves.
      growPage(1)
      reader.layout()
      await firstValueFrom(reader.spine.itemsLayout$)

      expect(scrollElement.scrollTop).toBe(
        placeShortOfTopOfPage + HEIGHT_GAINED_BY_PAGE_THAT_GROWS,
      )
    })
  })

  describe("When a layout moves the spine item at the top of the screen while the user scrolls", () => {
    it("keeps the place the user scrolled to on screen, and navigates to it once the scroll is over", async () => {
      const { reader, scrollElement, growPage } =
        await openOnPageOfBookWhosePagesCanGrow(1)
      const { userNavigations, isLockHeld } = recordNavigationsAndLock(reader)
      const placeScrolledTo = topOfPage(2) + 50

      scrollAsUser(scrollElement, placeScrolledTo)

      expect(isLockHeld()).toBe(true)

      growPage(0)
      reader.layout()
      await firstValueFrom(reader.spine.itemsLayout$)

      expect(scrollElement.scrollTop).toBe(
        placeScrolledTo + HEIGHT_GAINED_BY_PAGE_THAT_GROWS,
      )

      // A browser reports the reader's scroll at a later frame.
      deliverScrollEvent(scrollElement)
      await settledOn(reader, 2)

      expect(userNavigations().at(-1)?.position).toMatchObject({
        x: 0,
        y: placeScrolledTo + HEIGHT_GAINED_BY_PAGE_THAT_GROWS,
      })
      expect(scrollElement.scrollTop).toBe(
        placeScrolledTo + HEIGHT_GAINED_BY_PAGE_THAT_GROWS,
      )
    })

    it("takes a scroll the browser has not reported as the layout starts for the user's, and keeps its place on screen", async () => {
      const { reader, scrollElement, growPage } =
        await openOnPageOfBookWhosePagesCanGrow(1)
      const { userNavigations, isLockHeld } = recordNavigationsAndLock(reader)
      const placeScrolledTo = topOfPage(2) + 50

      growPage(0)
      reader.layout()

      /**
       * The user scrolls before the layout moves the pages, and the browser
       * reports it at a later frame: after the layout.
       */
      scrollElement.scrollTop = placeScrolledTo

      expect(isLockHeld()).toBe(false)

      await firstValueFrom(reader.spine.itemsLayout$)

      // The reader found the scroll as the layout started.
      expect(isLockHeld()).toBe(true)
      expect(scrollElement.scrollTop).toBe(
        placeScrolledTo + HEIGHT_GAINED_BY_PAGE_THAT_GROWS,
      )

      deliverScrollEvent(scrollElement)
      await settledOn(reader, 2)

      expect(userNavigations().at(-1)?.position).toMatchObject({
        x: 0,
        y: placeScrolledTo + HEIGHT_GAINED_BY_PAGE_THAT_GROWS,
      })
      expect(scrollElement.scrollTop).toBe(
        placeScrolledTo + HEIGHT_GAINED_BY_PAGE_THAT_GROWS,
      )
    })

    it("ends that scroll on the page the screen shows when the page turn mode then becomes controlled", async () => {
      const { reader, scrollElement, growPage } =
        await openOnPageOfBookWhosePagesCanGrow(1)
      // The top of a page: whichever way pages turn, it shows that page.
      const placeScrolledTo = topOfPage(2)

      scrollAsUser(scrollElement, placeScrolledTo)
      growPage(0)
      reader.layout()
      await firstValueFrom(reader.spine.itemsLayout$)

      expect(scrollElement.scrollTop).toBe(
        placeScrolledTo + HEIGHT_GAINED_BY_PAGE_THAT_GROWS,
      )

      /**
       * A browser takes the element's box away with the mode, and its
       * offsets with it. jsdom keeps them, so the test resets them. The
       * place the user's last move took the element to is on the first page
       * since that page grew: the third page is where the reader scrolled
       * the element since.
       */
      scrollElement.scrollTop = 0
      reader.settings.update({ pageTurnMode: "controlled" })

      // Polled rather than awaited, so that a failure names the page.
      await vi.waitFor(
        () =>
          expect(reader.pagination.state).toMatchObject({
            isSettled: true,
            begin: { spineItemIndex: 2 },
          }),
        { timeout: 2000 },
      )
    })
  })

  describe("When a layout that moves the spine item at the top of the screen takes several tasks", () => {
    it("scrolls by as much once the last spine item is laid out", async () => {
      const {
        reader,
        scrollElement,
        growPage,
        holdLayoutOfLastPage,
        releaseLayoutOfLastPage,
      } = await openOnPageOfBookWhosePagesCanGrow(2)
      const itemsLaidOut = firstValueFrom(reader.spine.itemsLayout$)

      holdLayoutOfLastPage()
      growPage(0)
      reader.layout()
      await firstValueFrom(reader.spine.itemsLayoutStart$)

      expect(scrollElement.scrollTop).toBe(topOfPage(2))

      releaseLayoutOfLastPage()
      await itemsLaidOut

      expect(scrollElement.scrollTop).toBe(
        topOfPage(2) + HEIGHT_GAINED_BY_PAGE_THAT_GROWS,
      )
    })

    it("leaves the element where the user scrolled it meanwhile", async () => {
      const {
        reader,
        scrollElement,
        growPage,
        holdLayoutOfLastPage,
        releaseLayoutOfLastPage,
      } = await openOnPageOfBookWhosePagesCanGrow(2)
      const itemsLaidOut = firstValueFrom(reader.spine.itemsLayout$)
      const placeScrolledToMeanwhile = topOfPage(1) + 50

      holdLayoutOfLastPage()
      growPage(0)
      reader.layout()
      await firstValueFrom(reader.spine.itemsLayoutStart$)

      // The user chose that place with the pages as the pass had them.
      scrollAsUser(scrollElement, placeScrolledToMeanwhile)
      releaseLayoutOfLastPage()
      await itemsLaidOut

      expect(scrollElement.scrollTop).toBe(placeScrolledToMeanwhile)
    })

    it("leaves the element where a navigation took it meanwhile", async () => {
      const {
        reader,
        scrollElement,
        growPage,
        holdLayoutOfLastPage,
        releaseLayoutOfLastPage,
      } = await openOnPageOfBookWhosePagesCanGrow(2)
      const itemsLaidOut = firstValueFrom(reader.spine.itemsLayout$)

      holdLayoutOfLastPage()
      growPage(0)
      reader.layout()
      await firstValueFrom(reader.spine.itemsLayoutStart$)

      reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })

      // where the layout the reader knows has the second page
      expect(scrollElement.scrollTop).toBe(topOfPage(1))

      releaseLayoutOfLastPage()
      await itemsLaidOut

      // The restoration onto the pages of the layout takes it from there.
      expect(scrollElement.scrollTop).toBe(topOfPage(1))
    })

    it("scrolls by as much when the layout stops as the viewport loses its size, and starts again", async () => {
      const {
        reader,
        scrollElement,
        growPage,
        holdLayoutOfLastPage,
        releaseLayoutOfLastPage,
      } = await openOnPageOfBookWhosePagesCanGrow(2)
      const itemsLaidOut = firstValueFrom(reader.spine.itemsLayout$)
      const stages: string[] = []

      reader.spine.pages.spineLayout.lifecycle$.subscribe(({ stage }) => {
        stages.push(stage)
      })

      holdLayoutOfLastPage()
      growPage(0)
      reader.layout()
      await firstValueFrom(reader.spine.itemsLayoutStart$)

      // The reader's container is hidden, then shown.
      const passStartedAgain = firstValueFrom(reader.spine.itemsLayoutStart$)

      setTestViewport({ width: 0, height: 0 })
      notifyResize()
      setTestViewport(defaultTestViewport)
      notifyResize()
      await passStartedAgain
      releaseLayoutOfLastPage()
      await itemsLaidOut

      expect(stages).toEqual(["requested", "layingOut", "layingOut", "laidOut"])
      expect(scrollElement.scrollTop).toBe(
        topOfPage(2) + HEIGHT_GAINED_BY_PAGE_THAT_GROWS,
      )
    })

    it("does not take another anchor when the layout starts again", async () => {
      const {
        reader,
        scrollElement,
        growPage,
        holdLayoutOfLastPage,
        releaseLayoutOfLastPage,
      } = await openOnPageOfBookWhosePagesCanGrow(2)
      const itemsLaidOut = firstValueFrom(reader.spine.itemsLayout$)
      const placeScrolledToMeanwhile = topOfPage(1) + 50

      holdLayoutOfLastPage()
      growPage(0)
      reader.layout()
      await firstValueFrom(reader.spine.itemsLayoutStart$)

      scrollAsUser(scrollElement, placeScrolledToMeanwhile)

      /**
       * A second request cancels the pass, and its own starts with the first
       * three pages where the cancelled one moved them. The layouts the
       * reader knows are still the ones from before both: an anchor taken
       * now would name the page that was at that place then.
       */
      reader.layout()
      await firstValueFrom(reader.spine.itemsLayoutStart$)
      releaseLayoutOfLastPage()
      await itemsLaidOut

      expect(scrollElement.scrollTop).toBe(placeScrolledToMeanwhile)
    })
  })
})

describe("Given a book whose pages turn", () => {
  describe("When the page turn mode changes", () => {
    it("gives its box to the rendering layer of the mode in use, and takes the other's away", async () => {
      const { reader, scrollElement } = await openOnPage(0)
      const controlledElement =
        reader.navigation.controlledNavigationController.element$.getValue()
      const displays = () => ({
        scroll: scrollElement.style.display,
        controlled: controlledElement.style.display,
      })

      expect(displays()).toEqual({ scroll: "contents", controlled: "block" })

      reader.settings.update({ pageTurnMode: "scrollable" })

      expect(displays()).toEqual({ scroll: "block", controlled: "contents" })

      reader.settings.update({ pageTurnMode: "controlled" })

      expect(displays()).toEqual({ scroll: "contents", controlled: "block" })
    })
  })

  describe("When the page turn mode becomes scrollable", () => {
    it("gives the navigation to the scroll element once it is the box the book scrolls in", async () => {
      const { reader, scrollElement, scrollToCalls } = await openOnPage(2)

      reader.settings.update({ pageTurnMode: "scrollable" })

      /**
       * Checked before the items are laid out again, so that the page stays
       * on screen meanwhile: the navigation must reach the scroll element once
       * it has its box, because an element without one cannot be scrolled.
       */
      expect(scrollToCalls).toEqual([
        { element: scrollElement, display: "block" },
      ])
    })
  })

  describe("When the page turn mode becomes scrollable a second time", () => {
    it("keeps the page when the scroll element reports a scroll as it gets its box back", async () => {
      const { reader, scrollElement } = await openOnPage(2)

      reader.settings.update({ pageTurnMode: "scrollable" })
      await waitFor(PAST_THE_END_OF_A_USER_SCROLL)
      await settledOn(reader, 2)

      reader.settings.update({ pageTurnMode: "controlled" })
      await waitFor(PAST_THE_END_OF_A_USER_SCROLL)
      await settledOn(reader, 2)

      const { userNavigations, hasLockBeenHeld } =
        recordNavigationsAndLock(reader)

      reader.settings.update({ pageTurnMode: "scrollable" })

      /**
       * Chromium gives the element the offsets it had when it last scrolled,
       * clamps them to the pages, still side by side, and reports that scroll
       * a few milliseconds later. By then the reader has scrolled the element
       * to the navigation, so the event shows the element where the reader
       * left it.
       */
      await waitFor(5)
      deliverScrollEvent(scrollElement)
      await waitFor(PAST_THE_END_OF_A_USER_SCROLL)

      expect(hasLockBeenHeld()).toBe(false)
      expect(userNavigations()).toHaveLength(0)
      expect(reader.navigation.getNavigation().spineItem).toBe(2)
      expect(scrollElement.scrollTop).toBe(topOfPage(2))
    })
  })
})
