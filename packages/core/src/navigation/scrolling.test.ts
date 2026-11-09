// @vitest-environment jsdom
import { first, firstValueFrom, skip } from "rxjs"
import { describe, expect, it } from "vitest"
import { SpinePosition } from "../spine/types"
import {
  createPrePaginatedManifest,
  createTestReader,
  defaultTestViewport,
  deliverScrollEvent,
  installReaderTestEnvironment,
  mountTestReader,
  settledOn,
  stubElementScrolling,
} from "../tests/readerHarness"
import { waitFor } from "../tests/utils"
import type { Navigation } from "./types"

installReaderTestEnvironment()

/**
 * Longer than the wait after which a scroll the reader did not make becomes a
 * navigation (`SCROLL_FINISHED_DEBOUNCE_TIMEOUT`).
 */
const PAST_THE_END_OF_A_USER_SCROLL = 700

/** Four pages, one item each, stacked a viewport apart once they scroll. */
const createFourPagesTestReader = (
  options: Parameters<typeof createTestReader>[0] = {},
) =>
  createTestReader({
    manifest: createPrePaginatedManifest({
      pageSpreads: [undefined, undefined, undefined, undefined],
    }),
    ...options,
  })

type TestReader = ReturnType<typeof createTestReader>

const getScrollElement = (reader: TestReader) => {
  const { element } = reader.navigation.scrollNavigationController.value

  if (!element) throw new Error("the reader is not mounted")

  return element
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

const topOfPage = (pageIndex: number) => pageIndex * defaultTestViewport.height

describe("Given a book that scrolls", () => {
  describe("When the reader scrolls to a navigation", () => {
    it("does not take the scroll event that follows for the user's, however late it comes", async () => {
      stubElementScrolling()

      const reader = createFourPagesTestReader({ pageTurnMode: "scrollable" })

      mountTestReader(reader)
      await settledOn(reader, 0)

      const scrollElement = getScrollElement(reader)

      reader.navigation.navigate({
        target: {
          type: "position",
          value: new SpinePosition({ x: 0, y: topOfPage(2) }),
        },
        animation: false,
      })
      await settledOn(reader, 2)

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

  describe("When the element scrolls to where the reader did not put it", () => {
    it("takes the scroll for the user's, and navigates to where it stops", async () => {
      stubElementScrolling()

      const reader = createFourPagesTestReader({ pageTurnMode: "scrollable" })

      mountTestReader(reader)
      await settledOn(reader, 0)

      const scrollElement = getScrollElement(reader)
      const { userNavigations, hasLockBeenHeld } =
        recordNavigationsAndLock(reader)

      scrollElement.scrollTop = topOfPage(1)
      deliverScrollEvent(scrollElement)

      expect(hasLockBeenHeld()).toBe(true)

      await settledOn(reader, 1)

      expect(userNavigations().at(-1)?.position).toMatchObject({
        x: 0,
        y: topOfPage(1),
      })
    })

    it("does not take a second event at the same offsets for another scroll", async () => {
      stubElementScrolling()

      const reader = createFourPagesTestReader({ pageTurnMode: "scrollable" })

      mountTestReader(reader)
      await settledOn(reader, 0)

      const scrollElement = getScrollElement(reader)
      const scrollsNotMadeByReader: Event[] = []

      reader.navigation.scrollNavigationController.scrollNotMadeByReader$.subscribe(
        (event) => {
          scrollsNotMadeByReader.push(event)
        },
      )

      scrollElement.scrollTop = topOfPage(1)
      deliverScrollEvent(scrollElement)
      deliverScrollEvent(scrollElement)

      expect(scrollsNotMadeByReader).toHaveLength(1)
    })
  })

  describe("When the page turn mode becomes controlled while the user scrolls", () => {
    it("does not navigate to where the scroll element is left once the scroll ends", async () => {
      stubElementScrolling()

      const reader = createFourPagesTestReader({ pageTurnMode: "scrollable" })

      mountTestReader(reader)
      await settledOn(reader, 0)

      const scrollElement = getScrollElement(reader)

      reader.navigation.navigate({
        target: {
          type: "position",
          value: new SpinePosition({ x: 0, y: topOfPage(2) }),
        },
        animation: false,
      })
      await settledOn(reader, 2)

      const { userNavigations, hasLockBeenHeld, isLockHeld } =
        recordNavigationsAndLock(reader)

      // a little further into the same page
      scrollElement.scrollTop = topOfPage(2) + 10
      deliverScrollEvent(scrollElement)

      expect(hasLockBeenHeld()).toBe(true)

      /**
       * The element loses its box with the mode, and its offsets with it:
       * they no longer say where the user is.
       */
      reader.settings.update({ pageTurnMode: "controlled" })
      await waitFor(PAST_THE_END_OF_A_USER_SCROLL)

      expect(userNavigations()).toHaveLength(0)
      expect(isLockHeld()).toBe(false)

      await settledOn(reader, 2)
    })
  })

  describe("When a layout leaves less to scroll than the element had scrolled", () => {
    it("does not take the scroll the browser clamps the element to for the user's", async () => {
      stubElementScrolling()

      const reader = createFourPagesTestReader({ pageTurnMode: "scrollable" })

      mountTestReader(reader)
      await settledOn(reader, 0)

      const scrollElement = getScrollElement(reader)

      reader.navigation.navigate({
        target: {
          type: "position",
          value: new SpinePosition({ x: 0, y: topOfPage(2) }),
        },
        animation: false,
      })
      await settledOn(reader, 2)

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
})

describe("Given a book whose pages turn", () => {
  describe("When the page turn mode becomes scrollable", () => {
    it("gives the navigation to the scroll element once it is the box the book scrolls in", async () => {
      const { scrollToCalls } = stubElementScrolling()

      const reader = createFourPagesTestReader()

      mountTestReader(reader)
      reader.navigation.goToSpineItem({ indexOrId: 2, animation: false })
      await settledOn(reader, 2)

      const scrollElement = getScrollElement(reader)

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
    it("keeps the page when the scroll element reports a scroll of the browser's own", async () => {
      stubElementScrolling()

      const reader = createFourPagesTestReader()

      mountTestReader(reader)
      reader.navigation.goToSpineItem({ indexOrId: 2, animation: false })
      await settledOn(reader, 2)

      const scrollElement = getScrollElement(reader)

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
       * a few milliseconds later: before the pages are stacked again.
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
