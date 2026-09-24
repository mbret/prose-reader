// @vitest-environment jsdom
import { firstValueFrom, skip, timeout } from "rxjs"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  createPrePaginatedManifest,
  createTestReader,
  createZoomableTestReader,
  installReaderTestEnvironment,
  mountTestReader,
  notifyResize,
  resizeObservers,
  setTestViewport,
  settledOn,
} from "../../tests/readerHarness"

installReaderTestEnvironment()

/** The container observer waits this long for a resize to stop. */
const RESIZE_DEBOUNCE = 100

/** Counts every layout the reader runs from now on. */
const countLayouts = (reader: ReturnType<typeof createTestReader>) => {
  let layouts = 0

  reader.viewport.layout$.subscribe(() => {
    layouts += 1
  })

  return () => layouts
}

const mountedAndSettled = async () => {
  const reader = createTestReader()

  mountTestReader(reader)
  await settledOn(reader)

  return reader
}

afterEach(() => {
  vi.useRealTimers()
})

describe("Given a reader being mounted", () => {
  it("measures the viewport once", async () => {
    const reader = createTestReader()
    const layouts = countLayouts(reader)

    mountTestReader(reader)
    await settledOn(reader)

    expect(layouts()).toBe(1)
  })
})

describe("Given a mounted reader", () => {
  it("keeps watching the container with the same observer when a setting changes", async () => {
    const reader = await mountedAndSettled()

    expect(resizeObservers()).toEqual({ created: 1, watching: 1 })

    reader.settings.update({ pageTurnAnimation: "none" })

    expect(resizeObservers()).toEqual({ created: 1, watching: 1 })
  })

  it("stops watching the container when layoutAutoResize is off, and watches again when it is back on", async () => {
    const reader = await mountedAndSettled()

    reader.settings.update({ layoutAutoResize: false })

    expect(resizeObservers().watching).toBe(0)

    reader.settings.update({ layoutAutoResize: "container" })

    expect(resizeObservers().watching).toBe(1)
  })

  it("does not lay out again when the container reports the size it was laid out at", async () => {
    const reader = await mountedAndSettled()
    const layouts = countLayouts(reader)

    vi.useFakeTimers()
    // a browser delivers this first observation right after mount
    notifyResize()
    vi.advanceTimersByTime(RESIZE_DEBOUNCE * 2)

    expect(layouts()).toBe(0)
  })

  it("lays out once the container has settled on a new size", async () => {
    const reader = await mountedAndSettled()
    const layouts = countLayouts(reader)

    vi.useFakeTimers()
    setTestViewport({ width: 120, height: 200 })
    notifyResize()
    notifyResize()
    vi.advanceTimersByTime(RESIZE_DEBOUNCE * 2)

    expect(layouts()).toBe(1)
    expect(reader.viewport.value.width).toBe(120)
  })

  it("does not lay out for a resize reported just before layoutAutoResize is turned off", async () => {
    const reader = await mountedAndSettled()
    const layouts = countLayouts(reader)

    vi.useFakeTimers()
    setTestViewport({ width: 120, height: 200 })
    notifyResize()
    reader.settings.update({ layoutAutoResize: false })
    vi.advanceTimersByTime(RESIZE_DEBOUNCE * 2)

    expect(layouts()).toBe(0)
  })
})

describe("Given a zoomed reader", () => {
  it("still lays out for a resize the container reported before the zoom changed", async () => {
    const reader = createZoomableTestReader()

    mountTestReader(reader)
    await settledOn(reader)

    expect(reader.spine.getSpineItemSpineLayoutInfo(1).left).toBe(100)

    vi.useFakeTimers()
    // still portrait, so no spread setting changes and lays out on its own
    setTestViewport({ width: 120, height: 200 })
    notifyResize()
    // zooming transforms the viewport while the resize waits to be handled
    reader.zoom.enter()
    reader.zoom.scaleAt(2)
    await vi.advanceTimersByTimeAsync(RESIZE_DEBOUNCE * 2)

    // the items were laid out for the new size
    expect(reader.spine.getSpineItemSpineLayoutInfo(1).left).toBe(120)
  })
})

describe("Given a setting that changes how the items are placed", () => {
  /** Where the second item starts, once the reader has laid out again. */
  const secondItemAfterLayout = async (
    reader: ReturnType<typeof createTestReader>,
  ) => {
    await firstValueFrom(reader.layout$.pipe(timeout(2000)))

    const { left, top } = reader.spine.getSpineItemSpineLayoutInfo(1)

    return { left, top }
  }

  it("lays out once when pageTurnDirection changes, and stacks the items", async () => {
    const reader = await mountedAndSettled()
    const layouts = countLayouts(reader)

    expect(reader.spine.getSpineItemSpineLayoutInfo(1).left).toBe(100)

    reader.settings.update({ pageTurnDirection: "vertical" })

    expect(layouts()).toBe(1)
    expect(await secondItemAfterLayout(reader)).toEqual({ left: 0, top: 200 })
  })

  it("lays out once when pageTurnMode changes, and stacks the items", async () => {
    const reader = await mountedAndSettled()
    const layouts = countLayouts(reader)

    // scrolling is vertical only, so this also changes the direction
    reader.settings.update({ pageTurnMode: "scrollable" })

    expect(layouts()).toBe(1)
    expect(await secondItemAfterLayout(reader)).toEqual({ left: 0, top: 200 })
  })
})

describe("Given a spread whose first page is on the right, with no item preloaded", () => {
  /**
   * Turning to the next spread loads its two items and unloads the first one,
   * and each of those lays the spine out again. The loader looks at what to
   * load after every layout, so a layout that led it to load or unload once
   * more would repeat forever.
   */
  it("stops laying out once the next spread has settled", async () => {
    vi.useFakeTimers()
    // landscape, so the pages pair into spreads
    setTestViewport({ width: 200, height: 100 })

    const reader = createTestReader({
      manifest: createPrePaginatedManifest({
        pageSpreads: ["right", "left", "right", "left"],
      }),
      numberOfAdjacentSpineItemToPreLoad: 0,
    })

    mountTestReader(reader)
    await vi.runAllTimersAsync()

    // the first spread is a blank left page and the first item
    expect(reader.pagination.state).toMatchObject({
      isSettled: true,
      begin: { spineItemIndex: 0 },
      end: { spineItemIndex: 0 },
    })

    const settlement: boolean[] = []
    // skip the replayed current result
    reader.pagination.state$
      .pipe(skip(1))
      .subscribe((state) => settlement.push(state.isSettled))

    reader.navigation.turnRight()

    /**
     * Runs every timer the reader has scheduled, and every one those schedule,
     * until none is left. A reader that keeps laying out never runs out, and
     * this gives up on it as an infinite loop.
     */
    await vi.runAllTimersAsync()

    expect(reader.pagination.state).toMatchObject({
      isSettled: true,
      begin: { spineItemIndex: 1 },
      end: { spineItemIndex: 2 },
    })
    // A layout requested after the result settled would have withdrawn it.
    expect(settlement.slice(settlement.indexOf(true))).toEqual([true])
  })
})
