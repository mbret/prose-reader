// @vitest-environment jsdom
import { skip } from "rxjs"
import { describe, expect, it } from "vitest"
import {
  createEnhancedTestReader,
  createTestReader,
  installReaderTestEnvironment,
  mountTestReader,
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
})
