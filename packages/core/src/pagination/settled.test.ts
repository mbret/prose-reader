import { filter, firstValueFrom, of, timeout } from "rxjs"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createCoordinatesApi } from "../enhancers/layout/coordinates"
import { paginationEnhancer } from "../enhancers/pagination/enhancer"
import type { NavigationState } from "../navigation/operators"
import { cleanups, setup } from "../tests/reader"

afterEach(() => vi.useRealTimers())

describe("settled pagination", () => {
  it("keeps activity free while waiting for content and shares the settled state", async () => {
    const { reader, load, settled } = setup()
    const states: NavigationState[] = []
    reader.navigation.navigationState$.subscribe((state) => states.push(state))
    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    expect(states.at(-1)).toEqual({ activity: "free", isSettled: false })
    load(1)
    await settled()
    expect(states.at(-1)).toEqual({ activity: "free", isSettled: true })
    expect(states).not.toContainEqual({ activity: "busy", isSettled: true })
    const replayed = await firstValueFrom(reader.navigation.navigationState$)
    expect(replayed).toEqual(states.at(-1))
  })

  it("cancels scheduled settlement when another request needs unloaded content", async () => {
    vi.useFakeTimers()
    const { reader, load } = setup()
    const states: NavigationState[] = []
    reader.navigation.navigationState$.subscribe((state) => states.push(state))
    load(0)
    reader.navigation.goToSpineItem({ indexOrId: 0, animation: false })
    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    await vi.advanceTimersByTimeAsync(1)
    expect(states.every((state) => !state.isSettled)).toBe(true)
    load(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(states.at(-1)).toEqual({ activity: "free", isSettled: true })
  })

  it("marks the state busy before resolving a request and does not retrigger viewport work on settlement", async () => {
    const { reader, load, settled } = setup()
    load(0)
    reader.navigation.goToSpineItem({ indexOrId: 0, animation: false })
    await settled()
    let state: NavigationState | undefined
    reader.navigation.navigationState$.subscribe((value) => {
      state = value
    })
    const resolver = reader.navigation.navigationResolver
    const resolve = resolver.getNavigationForSpineIndexOrId
    const spy = vi
      .spyOn(resolver, "getNavigationForSpineIndexOrId")
      .mockImplementation((...args) => {
        expect(state).toEqual({ activity: "busy", isSettled: false })
        return resolve(...args)
      })
    const viewportStates: string[] = []
    reader.context.bridgeEvent.viewportState$.subscribe((value) =>
      viewportStates.push(value),
    )
    reader.navigation.goToSpineItem({ indexOrId: 0, animation: false })
    expect(spy).toHaveBeenCalled()
    expect(state).toEqual({ activity: "free", isSettled: false })
    const viewportEventsBeforeSettlement = [...viewportStates]
    await settled()
    expect(state).toEqual({ activity: "free", isSettled: true })
    expect(viewportStates).toEqual(viewportEventsBeforeSettlement)
  })

  it("completes the navigation state and cancels queued settlement on destruction", async () => {
    vi.useFakeTimers()
    const { reader, load } = setup()
    const states: NavigationState[] = []
    let completed = false
    reader.navigation.navigationState$.subscribe({
      next: (state) => states.push(state),
      complete: () => {
        completed = true
      },
    })
    load(0)
    reader.navigation.goToSpineItem({ indexOrId: 0, animation: false })
    reader.destroy()
    await vi.advanceTimersByTimeAsync(1)
    expect(completed).toBe(true)
    expect(states.every((state) => !state.isSettled)).toBe(true)
  })

  it("does not persist an unloaded item's temporary root CFI", async () => {
    const { reader, load, settled } = setup()
    const saved: string[] = []
    reader.pagination.state$
      .pipe(filter((state) => state.isSettled))
      .subscribe((state) => {
        if (state.beginCfi) saved.push(state.beginCfi)
      })
    expect(reader.pagination.state.isSettled).toBe(false)
    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    expect(reader.pagination.state.isSettled).toBe(false)
    expect(saved).toEqual([])
    load(1)
    await settled()
    expect(saved.length).toBeGreaterThan(0)
    expect(reader.cfi.isRootCfi(saved.at(-1) ?? "")).toBe(false)
    expect(reader.pagination.state.beginSpineItemIndex).toBe(1)
  })

  it("invalidates settled progress immediately for repeated navigation", async () => {
    const { reader, load, settled } = setup()
    load(0)
    reader.navigation.goToSpineItem({ indexOrId: 0, animation: false })
    await settled()
    const states: boolean[] = []
    reader.navigation.settled$.subscribe((value) => states.push(value))
    for (let attempt = 0; attempt < 2; attempt++) {
      reader.navigation.goToPageOfSpineItem({
        spineItemId: 0,
        pageIndex: 1,
        animation: false,
      })
      expect(states.at(-1)).toBe(false)
      expect(reader.pagination.state.isSettled).toBe(false)
      await settled()
      expect(states.slice(-2)).toEqual([false, true])
      expect(reader.pagination.state.beginPageIndexInSpineItem).toBe(1)
    }
  })

  it("waits for the pagination enhancer to publish the matching snapshot", async () => {
    const { reader, load, settled } = setup()
    vi.spyOn(reader.spine.pages, "layout$", "get").mockReturnValue(
      reader.spine.layout$,
    )
    const enhanced = paginationEnhancer(() => ({
      ...reader,
      layout$: reader.spine.layout$,
      layoutInfo$: of({ pages: [] }),
      coordinates: createCoordinatesApi(reader),
    }))({})
    cleanups.push(() => enhanced.destroy())
    const navigationStates: NavigationState[] = []
    enhanced.navigation.navigationState$.subscribe((state) =>
      navigationStates.push(state),
    )
    const states: boolean[] = []
    enhanced.navigation.settled$.subscribe((value) => states.push(value))
    load(0)
    reader.navigation.goToSpineItem({ indexOrId: 0, animation: false })
    await settled()
    expect(states.at(-1)).toBe(false)
    expect(navigationStates.at(-1)?.isSettled).toBe(false)
    expect(enhanced.pagination.state.isSettled).toBe(false)
    await firstValueFrom(
      enhanced.navigation.settled$.pipe(filter(Boolean), timeout(1000)),
    )
    expect(enhanced.pagination.state.navigationId).toBe(
      reader.pagination.state.navigationId,
    )
    expect(enhanced.pagination.state.isSettled).toBe(true)
    expect(navigationStates.at(-1)?.isSettled).toBe(true)
    reader.navigation.goToPageOfSpineItem({
      spineItemId: 0,
      pageIndex: 1,
      animation: false,
    })
    expect(states.at(-1)).toBe(false)
    expect(navigationStates.at(-1)?.isSettled).toBe(false)
    expect(enhanced.pagination.state.isSettled).toBe(false)
    await firstValueFrom(
      enhanced.navigation.settled$.pipe(filter(Boolean), timeout(1000)),
    )
    expect(enhanced.pagination.state.beginPageIndexInSpineItem).toBe(1)
  })

  it("waits for navigation locks even when the item is loaded", async () => {
    const { reader, load, settled } = setup()
    load(0)
    reader.navigation.goToSpineItem({ indexOrId: 0, animation: false })
    await settled()
    const unlock = reader.navigation.lock()
    expect(reader.pagination.state.isSettled).toBe(false)
    reader.navigation.goToPageOfSpineItem({
      spineItemId: 0,
      pageIndex: 1,
      animation: false,
    })
    expect(reader.pagination.state.isSettled).toBe(false)
    unlock()
    await settled()
    expect(reader.pagination.state.beginPageIndexInSpineItem).toBe(1)
  })

  it("invalidates settlement during relayout and completes on destruction", async () => {
    const { reader, load, settled, relayout } = setup()
    load(0)
    reader.navigation.goToSpineItem({ indexOrId: 0, animation: false })
    await settled()
    const states: boolean[] = []
    reader.navigation.settled$.subscribe((value) => states.push(value))
    relayout()
    expect(states).toContain(false)
    await settled()
    let completed = false
    reader.navigation.settled$.subscribe({
      complete: () => {
        completed = true
      },
    })
    reader.destroy()
    expect(completed).toBe(true)
  })
})
