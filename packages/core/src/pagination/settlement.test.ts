// @vitest-environment jsdom
import { distinctUntilChanged, filter, first, map, skip } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import {
  createEnhancedTestReader,
  createTestReader,
  holdItem,
  holdItemLayout,
  installReaderTestEnvironment,
  mountTestReader,
  setTestViewport,
  settledOn,
} from "../tests/readerHarness"
import { waitFor } from "../tests/utils"
import type { PaginationInfo } from "./types"

installReaderTestEnvironment()

describe("pagination settlement", () => {
  it("starts provisional and settles on a position for the ready item", async () => {
    const reader = createTestReader()

    expect(reader.pagination.state.isSettled).toBe(false)

    mountTestReader(reader)

    const state = await settledOn(reader)

    expect(state.isSettled).toBe(true)
    expect(reader.spineItemsManager.items[0]?.value.isReady).toBe(true)
    /**
     * The settled variant guarantees positions, so no narrowing is needed to
     * read them. A completed pre-paginated item legitimately resolves to its
     * root cfi; what settlement rules out is a root cfi standing in for content
     * that has not loaded.
     */
    expect(reader.cfi.parseCfi(state.begin.cfi).itemIndex).toBe(0)
  })

  it("never settles while the visible content is not ready", async () => {
    const reader = createTestReader()

    const samples: { isSettled: boolean; beginIsReady: boolean }[] = []
    reader.pagination.state$.subscribe((state) => {
      samples.push({
        isSettled: state.isSettled,
        beginIsReady:
          reader.spineItemsManager.get(state.begin.spineItemIndex)?.value
            .isReady ?? false,
      })
    })

    mountTestReader(reader)
    await settledOn(reader)

    expect(
      samples.filter(
        ({ isSettled, beginIsReady }) => isSettled && !beginIsReady,
      ),
    ).toEqual([])
  })

  it("ends settlement when a navigation starts, before the next result resolves", async () => {
    const reader = createTestReader()

    mountTestReader(reader)
    await settledOn(reader)

    const states: PaginationInfo[] = []
    // skip the replayed current result
    reader.pagination.state$
      .pipe(skip(1))
      .subscribe((state) => states.push(state))

    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })

    // The withdrawal is the first thing published for the request, ahead of
    // any result for the new page, however quickly that result follows.
    expect(states[0]?.isSettled).toBe(false)

    const next = await settledOn(reader, 1)

    expect(next.begin.spineItemIndex).toBe(1)
  })

  it("does not resolve again when a result anchors the navigation", async () => {
    const reader = createTestReader()

    mountTestReader(reader)
    await settledOn(reader)

    const states: PaginationInfo[] = []
    reader.pagination.state$
      .pipe(skip(1))
      .subscribe((state) => states.push(state))

    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    await settledOn(reader, 1)
    await waitFor(50)

    /**
     * A settled result anchors the navigation. The anchor is not a navigation
     * and never reaches the navigation stream, so it cannot trigger another
     * resolution, which would withdraw and re-grant settlement over nothing.
     */
    const firstSettled = states.findIndex(
      (state) => state.isSettled && state.begin.spineItemIndex === 1,
    )

    expect(states.slice(firstSettled + 1)).toEqual([])
  })

  it("ends settlement when a layout is requested, not when it completes", async () => {
    const reader = createTestReader()

    mountTestReader(reader)
    await settledOn(reader)

    expect(reader.pagination.state.isSettled).toBe(true)

    reader.layout()

    /**
     * Item layout is debounced and `spine.layout$` only reports a layout that
     * finished, so waiting for either would leave the current result standing
     * over a spine that is already being re-laid out.
     */
    expect(reader.pagination.state.isSettled).toBe(false)

    await waitFor(20)

    expect(reader.pagination.state.isSettled).toBe(false)

    // It comes back once the relayout has produced a result.
    const next = await settledOn(reader)

    expect(next.isSettled).toBe(true)
  })

  it("never republishes a previous page as settled after moving on", async () => {
    const reader = createEnhancedTestReader()

    mountTestReader(reader)
    await settledOn(reader)

    const settledItems: (number | undefined)[] = []
    // skip the replayed current result, which is legitimately item 0
    reader.pagination.state$.pipe(skip(1)).subscribe((state) => {
      if (state.isSettled) settledItems.push(state.begin.spineItemIndex)
    })

    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })

    await waitFor(100)

    /**
     * Enrichment is throttled, so one built for item 0 can arrive after the
     * reader has moved to item 1. Publishing it as settled would present the
     * previous page's position as the current one.
     */
    expect(settledItems.filter((index) => index === 0)).toEqual([])
  })

  it("withdraws enriched settlement as soon as the core result does", async () => {
    const reader = createEnhancedTestReader()

    mountTestReader(reader)
    await settledOn(reader)

    const states: boolean[] = []
    reader.pagination.state$.subscribe((state) => states.push(state.isSettled))

    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })

    // Throttling delays the enriched replacement, not the withdrawal: the
    // enriched result cannot keep claiming a settlement the core has dropped.
    expect(reader.pagination.state.isSettled).toBe(false)
    expect(states.at(-1)).toBe(false)
  })

  it("never settles a spread before both of its items are ready", async () => {
    // Landscape: the layout enhancer turns the pre-paginated pages into a spread.
    setTestViewport({ width: 200, height: 100 })

    const secondItem = holdItem("/page_1.jpg")
    const reader = createTestReader({ getRenderer: secondItem.getRenderer })
    const isReady = (index: number | undefined) =>
      reader.spineItemsManager.get(index)?.value.isReady ?? false

    const settledWithSecondItemNotReady: number[] = []
    reader.pagination.state$.subscribe((state) => {
      if (state.isSettled && !isReady(state.end.spineItemIndex)) {
        settledWithSecondItemNotReady.push(state.end.spineItemIndex ?? -1)
      }
    })

    /**
     * Pagination resolves when the spine lays out, synchronously and ahead of
     * this subscriber, so once the layout that follows the first item's
     * readiness reaches here the result for it is in place.
     */
    let layoutsWithOnlyTheFirstItemReady = 0
    reader.spine.layout$.subscribe(() => {
      if (isReady(0) && !isReady(1)) layoutsWithOnlyTheFirstItemReady += 1
    })

    mountTestReader(reader)
    await vi.waitFor(() =>
      expect(layoutsWithOnlyTheFirstItemReady).toBeGreaterThan(0),
    )

    /**
     * A spread shows two items, and the second one is still loading. A result
     * that settled now would anchor the entry to a spread whose right page has
     * no content yet.
     */
    expect(reader.pagination.state.begin.spineItemIndex).toBe(0)
    expect(reader.pagination.state.end.spineItemIndex).toBe(1)
    expect(reader.pagination.state.isSettled).toBe(false)
    expect(reader.navigation.getNavigation().paginationBeginCfi).toBeUndefined()

    secondItem.release()

    // Recovery, not just withholding: an implementation that never settles
    // would pass everything above.
    const state = await settledOn(reader)

    expect([state.begin.spineItemIndex, state.end.spineItemIndex]).toEqual([
      0, 1,
    ])
    expect(reader.navigation.getNavigation().paginationBeginCfi).toBe(
      state.begin.cfi,
    )
    expect(settledWithSecondItemNotReady).toEqual([])
  })

  it("does not settle a navigation while a requested layout is pending", async () => {
    const reader = createTestReader()

    mountTestReader(reader)
    await settledOn(reader)

    const isDirty = (index: number | undefined) =>
      reader.spineItemsManager.get(index)?.value.isDirty ?? false
    const settledOverDirtyItems: PaginationInfo[] = []
    reader.pagination.state$.subscribe((state) => {
      if (
        state.isSettled &&
        (isDirty(state.begin.spineItemIndex) ||
          isDirty(state.end.spineItemIndex))
      ) {
        settledOverDirtyItems.push(state)
      }
    })

    reader.layout()
    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })

    /**
     * The navigation resolves at once, against the pages the requested layout
     * is about to replace. The items are still loaded and ready: only the
     * request itself says the pages no longer describe the layout.
     */
    expect(reader.pagination.state.isSettled).toBe(false)

    const next = await settledOn(reader, 1)

    expect(next.begin.spineItemIndex).toBe(1)
    expect(settledOverDirtyItems).toEqual([])
  })

  it("ends settlement the moment a visible item unloads, and settles again once it reloads", async () => {
    const reader = createTestReader({ numberOfAdjacentSpineItemToPreLoad: 0 })

    mountTestReader(reader)
    await settledOn(reader, 0)

    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    await settledOn(reader, 1)

    const item = reader.spineItemsManager.get(1)

    if (!item) throw new Error("item 1 is missing")

    /**
     * Read inside the notification that drops readiness, not some time after
     * it. This subscriber is added after the result settled, so it runs after
     * the reader's own subscribers to the item: the earliest anyone can
     * observe the change is also when the result must already be withdrawn.
     */
    const settledWhenReadinessDropped: boolean[] = []
    item.isReady$
      .pipe(
        filter((isReady) => !isReady),
        first(),
      )
      .subscribe(() => {
        settledWhenReadinessDropped.push(reader.pagination.state.isSettled)
      })

    item.unload()
    await vi.waitFor(() => expect(settledWhenReadinessDropped).toHaveLength(1))

    // The page has no content any more, so the result cannot keep claiming to
    // describe it.
    expect(settledWhenReadinessDropped).toEqual([false])

    // The loader reloads a visible item, and the result comes back with it.
    const reloaded = await settledOn(reader, 1)

    expect(item.value.isReady).toBe(true)
    expect(reloaded.begin.spineItemIndex).toBe(1)
  })

  it("withdraws settlement while the spine relays out for another item, and settles again once on the new layout", async () => {
    /**
     * Item 1 is not visible. When its load finishes, the spine lays every item
     * out again on its own, without any request through `reader.layout()`.
     */
    const otherItem = holdItem("/page_1.jpg")
    const reader = createTestReader({ getRenderer: otherItem.getRenderer })

    mountTestReader(reader)
    await settledOn(reader, 0)

    const visibleItem = reader.spineItemsManager.get(0)

    if (!visibleItem) throw new Error("item 0 is missing")

    const settlement: boolean[] = []
    reader.pagination.state$
      .pipe(
        skip(1),
        map((state) => state.isSettled),
        distinctUntilChanged(),
      )
      .subscribe((isSettled) => settlement.push(isSettled))

    otherItem.release()
    await vi.waitFor(() => expect(visibleItem.value.isDirty).toBe(true))

    // The pages are about to be recomputed, so what the result says about the
    // page being read may no longer hold.
    expect(reader.pagination.state.isSettled).toBe(false)

    await settledOn(reader, 0)
    await waitFor(50)

    /**
     * Withdrawn once, settled once. The pages become current again a moment
     * before the result for them resolves, and granting settlement back to
     * the withdrawn result in that moment would publish positions resolved
     * over the replaced layout, then withdraw them again.
     */
    expect(settlement).toEqual([false, true])
  })

  it("does not settle a navigation while the spine relays out for another item", async () => {
    const otherItem = holdItem("/page_1.jpg")
    const reader = createTestReader({ getRenderer: otherItem.getRenderer })

    mountTestReader(reader)
    await settledOn(reader, 0)

    const visibleItem = reader.spineItemsManager.get(0)

    if (!visibleItem) throw new Error("item 0 is missing")

    otherItem.release()
    await vi.waitFor(() => expect(visibleItem.value.isDirty).toBe(true))

    reader.navigation.goToSpineItem({ indexOrId: 0, animation: false })

    // Nothing was requested through `reader.layout()`, but the pages it would
    // resolve over are about to be replaced all the same.
    expect(reader.pagination.state.isSettled).toBe(false)

    const next = await settledOn(reader, 0)

    expect(next.begin.spineItemIndex).toBe(0)
  })

  it("does not settle while the spine is still laying out, even once the visible item has been laid out", async () => {
    const laterItem = holdItemLayout("/page_1.jpg")
    const reader = createTestReader({ getRenderer: laterItem.getRenderer })

    mountTestReader(reader)
    await settledOn(reader, 0)

    const visibleItem = reader.spineItemsManager.get(0)
    const nextItem = reader.spineItemsManager.get(1)

    if (!visibleItem || !nextItem) throw new Error("an item is missing")

    laterItem.hold()
    reader.layout()

    // The pass lays the visible item out, then waits on the next one.
    await vi.waitFor(() => {
      expect(visibleItem.value.isDirty).toBe(false)
      expect(nextItem.value.isDirty).toBe(true)
    })

    reader.navigation.goToSpineItem({ indexOrId: 0, animation: false })

    /**
     * Nothing about the visible item says the layout is unfinished: it is laid
     * out and ready. The pages a result would be resolved over are still the
     * previous layout's, and are recomputed only once the pass completes.
     */
    expect(reader.pagination.state.isSettled).toBe(false)

    laterItem.release()

    const next = await settledOn(reader, 0)

    expect(next.begin.spineItemIndex).toBe(0)
  })

  it("does not settle on a pass that a newer layout request replaces", async () => {
    const laterItem = holdItemLayout("/page_1.jpg")
    const reader = createTestReader({ getRenderer: laterItem.getRenderer })

    mountTestReader(reader)
    await settledOn(reader, 0)

    const visibleItem = reader.spineItemsManager.get(0)
    const nextItem = reader.spineItemsManager.get(1)

    if (!visibleItem || !nextItem) throw new Error("an item is missing")

    // A first pass starts and waits on the next item.
    laterItem.hold()
    reader.layout()
    await vi.waitFor(() => {
      expect(visibleItem.value.isDirty).toBe(false)
      expect(nextItem.value.isDirty).toBe(true)
    })

    const layoutsBeforeSecondRequest = laterItem.layoutsStarted()

    /**
     * A second request arrives while the first pass is still running, and the
     * first pass could then finish: its held item is released at once. Only
     * the second pass may produce the layout the reader settles on, and it is
     * held on the same item. The item's dirty flag cannot say when that pass
     * gets there: the item finishes the layout it was released from and
     * clears the flag whether or not its pass still exists.
     */
    reader.layout()
    laterItem.release()
    laterItem.hold()
    await vi.waitFor(() =>
      expect(laterItem.layoutsStarted()).toBeGreaterThan(
        layoutsBeforeSecondRequest,
      ),
    )

    reader.navigation.goToSpineItem({ indexOrId: 0, animation: false })

    expect(reader.pagination.state.isSettled).toBe(false)

    laterItem.release()

    const next = await settledOn(reader, 0)

    expect(next.begin.spineItemIndex).toBe(0)
  })

  it("does not settle on pages still being computed when a newer layout is requested", async () => {
    const reader = createTestReader()

    mountTestReader(reader)
    await settledOn(reader, 0)

    /**
     * The moment a pass completes, its pages start resolving across animation
     * frames. A request made right then replaces the layout those pages
     * describe, before they exist.
     */
    let replaced = false
    reader.spine.pages.spineLayout.layout$.pipe(first()).subscribe(() => {
      reader.layout()
      replaced = true
    })
    reader.layout()
    await vi.waitFor(() => expect(replaced).toBe(true))

    // Long enough for the first pass's pages to have been published, had
    // they not been abandoned.
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await new Promise((resolve) => requestAnimationFrame(resolve))

    reader.navigation.goToSpineItem({ indexOrId: 0, animation: false })

    expect(reader.pagination.state.isSettled).toBe(false)

    const next = await settledOn(reader, 0)

    expect(next.begin.spineItemIndex).toBe(0)
  })
})
