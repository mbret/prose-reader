// @vitest-environment jsdom
import { first, firstValueFrom, skip } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import { SpinePosition } from "../spine/types.ts"
import {
  createPrePaginatedManifest,
  createTestReader,
  defaultTestViewport,
  deliverScrollEvent,
  installReaderTestEnvironment,
  mountTestReader,
  notifyResize,
  setTestViewport,
  settledOn,
  stubElementScrolling,
} from "../tests/readerHarness.ts"
import { waitFor } from "../tests/utils.ts"
import type { Navigation } from "./types.ts"

installReaderTestEnvironment()

/**
 * Long enough for a scroll of the user's to be over, and navigated to: it is
 * over 500 ms after its last event (`SCROLL_FINISHED_DEBOUNCE_TIMEOUT`).
 */
const PAST_THE_END_OF_A_USER_SCROLL = 700

type TestReader = ReturnType<typeof createTestReader>

const topOfPage = (pageIndex: number) => pageIndex * defaultTestViewport.height

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

  describe("When the app navigates before a scroll of the user's is over", () => {
    const targetOfApp = { type: "spineItem", value: 3 }

    const openAndScrollAsUser = async () => {
      const { reader, scrollElement } = await openOnPage(0, {
        pageTurnMode: "scrollable",
      })

      scrollAsUser(scrollElement, topOfPage(1) + 50)

      return { reader, scrollElement }
    }

    const getTargetAndTypeOfNavigation = (reader: TestReader) => {
      const { target, type } = reader.navigation.getNavigation()

      return { target, type }
    }

    it("ends the scroll at once", async () => {
      const { reader } = await openAndScrollAsUser()
      const { isLockHeld } = recordNavigationsAndLock(reader)

      expect(isLockHeld(), "whether the scroll holds the lock").toBe(true)

      reader.navigation.goToSpineItem({ indexOrId: 3, animation: false })

      expect(
        isLockHeld(),
        "whether the scroll holds the lock, after the navigation",
      ).toBe(false)
    })

    it("keeps the navigation the app asked for, once the scroll would have been over", async () => {
      const { reader, scrollElement } = await openAndScrollAsUser()

      reader.navigation.goToSpineItem({ indexOrId: 3, animation: false })
      await waitFor(PAST_THE_END_OF_A_USER_SCROLL)

      expect(getTargetAndTypeOfNavigation(reader)).toEqual({
        target: targetOfApp,
        type: "api",
      })
      expect(scrollElement.scrollTop).toBe(topOfPage(3))
      expect(reader.pagination.state).toMatchObject({
        isSettled: true,
        begin: { spineItemIndex: 3 },
      })
    })

    it("keeps it when a layout starts in the same task", async () => {
      const { reader } = await openAndScrollAsUser()

      reader.navigation.goToSpineItem({ indexOrId: 3, animation: false })
      reader.layout({ immediate: true })
      await waitFor(PAST_THE_END_OF_A_USER_SCROLL)

      expect(getTargetAndTypeOfNavigation(reader)).toEqual({
        target: targetOfApp,
        type: "api",
      })
    })

    it("keeps it when the page turn mode becomes controlled in the same task", async () => {
      const { reader } = await openAndScrollAsUser()

      reader.navigation.goToSpineItem({ indexOrId: 3, animation: false })
      reader.settings.update({ pageTurnMode: "controlled" })
      await waitFor(PAST_THE_END_OF_A_USER_SCROLL)

      expect(getTargetAndTypeOfNavigation(reader)).toEqual({
        target: targetOfApp,
        type: "api",
      })
    })

    it("keeps it when the reader's container is hidden, and makes it once the container is shown", async () => {
      const { reader } = await openAndScrollAsUser()

      const { isLockHeld } = recordNavigationsAndLock(reader)

      setTestViewport({ width: 0, height: 0 })
      notifyResize()
      reader.navigation.goToSpineItem({ indexOrId: 3, animation: false })

      expect(
        isLockHeld(),
        "whether the scroll holds the lock, while the container is hidden",
      ).toBe(false)

      await waitFor(PAST_THE_END_OF_A_USER_SCROLL)
      setTestViewport(defaultTestViewport)
      notifyResize()

      await vi.waitFor(() =>
        expect(getTargetAndTypeOfNavigation(reader)).toEqual({
          target: targetOfApp,
          type: "api",
        }),
      )
    })

    it("keeps it when it is asked for as the scroll takes the lock", async () => {
      const { reader, scrollElement } = await openOnPage(0, {
        pageTurnMode: "scrollable",
      })

      const { isLockHeld } = recordNavigationsAndLock(reader)
      const navigationsTold: string[] = []

      // The first one is the latest navigation, replayed.
      reader.navigation.navigation$
        .pipe(skip(1))
        .subscribe(({ triggeredBy }) => {
          navigationsTold.push(triggeredBy)
        })

      // Something that navigates as soon as the navigation is locked.
      reader.navigation.isLocked$
        .pipe(first((isLocked) => isLocked))
        .subscribe(() => {
          reader.navigation.goToSpineItem({ indexOrId: 3, animation: false })
        })

      scrollAsUser(scrollElement, topOfPage(1) + 50)

      expect(isLockHeld(), "whether the scroll holds the lock").toBe(false)
      expect(navigationsTold, "what triggered each navigation").toEqual([
        "user",
        "restoration",
      ])

      await waitFor(PAST_THE_END_OF_A_USER_SCROLL)

      expect(getTargetAndTypeOfNavigation(reader)).toEqual({
        target: targetOfApp,
        type: "api",
      })
    })

    it("takes the book to the place the navigation already has, when the app asks for that place", async () => {
      const { reader, scrollElement } = await openAndScrollAsUser()

      // The reader is still on the first page: the scroll is not over.
      expect(reader.navigation.getNavigation().spineItem).toBe(0)

      reader.navigation.goToSpineItem({ indexOrId: 0, animation: false })
      await waitFor(PAST_THE_END_OF_A_USER_SCROLL)

      expect(scrollElement.scrollTop, "where the book is").toBe(topOfPage(0))
      expect(reader.navigation.getNavigation()).toMatchObject({
        position: { x: 0, y: topOfPage(0) },
        spineItem: 0,
      })
      expect(reader.pagination.state).toMatchObject({
        isSettled: true,
        begin: { spineItemIndex: 0 },
      })
    })

    it("goes on with the scroll when the navigation names nothing in the book", async () => {
      const { reader, scrollElement } = await openAndScrollAsUser()
      const { isLockHeld } = recordNavigationsAndLock(reader)

      reader.navigation.navigate({
        target: { type: "spineItem", value: 99 },
        animation: false,
      })

      expect(isLockHeld(), "whether the scroll holds the lock").toBe(true)

      await waitFor(PAST_THE_END_OF_A_USER_SCROLL)

      expect(reader.navigation.getNavigation()).toMatchObject({
        type: "scroll",
        position: { x: 0, y: scrollElement.scrollTop },
      })
    })

    it("tells every listener of the navigation before its landing, which the release of the lock makes", async () => {
      const { reader } = await openAndScrollAsUser()

      // A listener that comes during the scroll, after the scroll's own.
      const navigationsToldToListener: string[] = []

      reader.navigation.navigation$
        .pipe(skip(1))
        .subscribe(({ triggeredBy }) => {
          navigationsToldToListener.push(triggeredBy)
        })

      reader.navigation.goToSpineItem({ indexOrId: 3, animation: false })

      expect(navigationsToldToListener).toEqual(["user", "restoration"])
    })

    it("takes the next move of the user for a new scroll", async () => {
      const { reader, scrollElement } = await openOnPage(0, {
        pageTurnMode: "scrollable",
      })
      const lockStates: boolean[] = []

      // The first one is the state now, replayed.
      reader.navigation.isLocked$.pipe(skip(1)).subscribe((isLocked) => {
        lockStates.push(isLocked)
      })

      scrollAsUser(scrollElement, topOfPage(1) + 50)
      reader.navigation.goToSpineItem({ indexOrId: 3, animation: false })
      scrollAsUser(scrollElement, topOfPage(2) + 20)
      await waitFor(PAST_THE_END_OF_A_USER_SCROLL)

      expect(lockStates, "each change of the lock").toEqual([
        true,
        false,
        true,
        false,
      ])
      expect(reader.navigation.getNavigation()).toMatchObject({
        type: "scroll",
        position: { x: 0, y: topOfPage(2) + 20 },
      })
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
