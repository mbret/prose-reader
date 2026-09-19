import { filter, firstValueFrom, of, timeout } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import { createCoordinatesApi } from "../enhancers/layout/coordinates"
import { paginationEnhancer } from "../enhancers/pagination/enhancer"
import { cleanups, setup } from "../tests/reader"

describe("settled pagination", () => {
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
    const states: boolean[] = []
    enhanced.navigation.settled$.subscribe((value) => states.push(value))
    load(0)
    reader.navigation.goToSpineItem({ indexOrId: 0, animation: false })
    await settled()
    expect(states.at(-1)).toBe(false)
    await firstValueFrom(
      enhanced.navigation.settled$.pipe(filter(Boolean), timeout(1000)),
    )
    expect(enhanced.pagination.state.navigationId).toBe(
      reader.pagination.state.navigationId,
    )
    expect(enhanced.pagination.state.isSettled).toBe(true)
    reader.navigation.goToPageOfSpineItem({
      spineItemId: 0,
      pageIndex: 1,
      animation: false,
    })
    expect(states.at(-1)).toBe(false)
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
