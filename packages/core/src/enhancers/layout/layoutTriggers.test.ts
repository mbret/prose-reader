// @vitest-environment jsdom
import { filter, firstValueFrom, skip, timeout } from "rxjs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  createPrePaginatedManifest,
  createTestReader,
  createZoomableTestReader,
  defaultTestViewport,
  getTestContainer,
  holdItem,
  holdItemLayout,
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

/** Where the second item starts, once the reader has laid out again. */
const secondItemAfterLayout = async (
  reader: ReturnType<typeof createTestReader>,
) => {
  await firstValueFrom(reader.layout$.pipe(timeout(2000)))

  const { left, top } = reader.spine.getSpineItemSpineLayoutInfo(1)

  return { left, top }
}

/** The first settled result that shows the first two items side by side. */
const settledOnSpread = async (reader: ReturnType<typeof createTestReader>) => {
  const spread = await firstValueFrom(
    reader.pagination.state$.pipe(
      filter((state) => state.isSettled && state.end.spineItemIndex === 1),
      timeout(2000),
    ),
  )

  return [spread.begin.spineItemIndex, spread.end.spineItemIndex]
}

const mountedAndSettled = async (
  options: Parameters<typeof createTestReader>[0] = {},
) => {
  const reader = createTestReader(options)

  mountTestReader(reader)
  await settledOn(reader)

  return reader
}

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
  it("lays out once for a resize that turns the spread on, and shows the spread", async () => {
    const reader = await mountedAndSettled()
    const layouts = countLayouts(reader)

    setTestViewport({ width: 400, height: 200 })
    reader.layout()

    expect(layouts()).toBe(1)
    expect(reader.viewport.value.isSpread).toBe(true)
    expect(await settledOnSpread(reader)).toEqual([0, 1])
  })

  it("lays out once for a resize that turns the spread off, and shows one page at a time", async () => {
    // landscape, so the reader opens on a spread
    setTestViewport({ width: 400, height: 200 })

    const reader = await mountedAndSettled()
    const layouts = countLayouts(reader)

    expect(reader.viewport.value.isSpread).toBe(true)

    setTestViewport({ width: 100, height: 200 })
    reader.layout()

    expect(layouts()).toBe(1)
    expect(reader.viewport.value.isSpread).toBe(false)
    expect(await secondItemAfterLayout(reader)).toEqual({ left: 100, top: 0 })
  })

  it("keeps watching the container with the same observer when a setting changes", async () => {
    const reader = await mountedAndSettled()
    const container = getTestContainer()

    expect(resizeObservers(container)).toEqual({ created: 1, watching: 1 })

    reader.settings.update({ pageTurnAnimation: "none" })

    expect(resizeObservers(container)).toEqual({ created: 1, watching: 1 })
  })

  it("stops watching the container when layoutAutoResize is off, and watches again when it is back on", async () => {
    const reader = await mountedAndSettled()
    const container = getTestContainer()

    reader.settings.update({ layoutAutoResize: false })

    expect(resizeObservers(container).watching).toBe(0)

    reader.settings.update({ layoutAutoResize: "container" })

    // an observer starts in the next animation frame
    await vi.waitFor(() => expect(resizeObservers(container).watching).toBe(1))
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

/**
 * A container hidden under `display: none`, by an `<Activity>`, a tab or a CSS
 * toggle, measures 0 by 0. So does every element in it, the viewport and the
 * items' documents included.
 */
describe("Given a mounted reader whose container is hidden", () => {
  const hidden = { width: 0, height: 0 }
  /** The loader waits this long for the navigation to settle. */
  const LOADER_DEBOUNCE = 100

  /** The size the viewport's element had at each item layout of the test. */
  let viewportSizesAtItemLayouts: { width: number; height: number }[] = []

  const recordViewportSizeAtItemLayouts = (
    reader: ReturnType<typeof createTestReader>,
  ) => {
    reader.hookManager.register("item.onBeforeLayout", () => {
      const { clientWidth, clientHeight } = reader.viewport.value.element

      viewportSizesAtItemLayouts.push({
        width: clientWidth,
        height: clientHeight,
      })
    })
  }

  const mountedAndSettledRecordingItemLayouts = async (
    options: Parameters<typeof createTestReader>[0] = {},
  ) => {
    const reader = createTestReader(options)

    recordViewportSizeAtItemLayouts(reader)
    mountTestReader(reader)
    await settledOn(reader)

    return reader
  }

  beforeEach(() => {
    viewportSizesAtItemLayouts = []
  })

  // whatever a test does, no item is laid out while the viewport has no size
  afterEach(() => {
    expect(viewportSizesAtItemLayouts).not.toContainEqual(hidden)
  })

  it("does not lay out, and keeps its page and its layout, while the container has no size", async () => {
    const reader = await mountedAndSettledRecordingItemLayouts()
    const layouts = countLayouts(reader)
    const settledBeforeHiding = reader.pagination.state

    vi.useFakeTimers()
    setTestViewport(hidden)
    notifyResize()
    vi.advanceTimersByTime(RESIZE_DEBOUNCE * 2)

    expect(layouts()).toBe(0)
    expect(reader.spine.isLayoutCurrent()).toBe(true)
    expect(reader.pagination.state).toBe(settledBeforeHiding)
  })

  it("does not lay out when the container is shown again at the size it was laid out at", async () => {
    const reader = await mountedAndSettledRecordingItemLayouts()
    const layouts = countLayouts(reader)

    vi.useFakeTimers()
    setTestViewport(hidden)
    notifyResize()
    vi.advanceTimersByTime(RESIZE_DEBOUNCE * 2)
    setTestViewport(defaultTestViewport)
    notifyResize()
    vi.advanceTimersByTime(RESIZE_DEBOUNCE * 2)

    expect(layouts()).toBe(0)
  })

  it("lays out once when the container is shown again at another size", async () => {
    const reader = await mountedAndSettledRecordingItemLayouts()
    const layouts = countLayouts(reader)

    vi.useFakeTimers()
    setTestViewport(hidden)
    notifyResize()
    vi.advanceTimersByTime(RESIZE_DEBOUNCE * 2)
    setTestViewport({ width: 120, height: 200 })
    notifyResize()
    vi.advanceTimersByTime(RESIZE_DEBOUNCE * 2)

    expect(layouts()).toBe(1)
    expect(reader.viewport.value.width).toBe(120)
  })

  it("holds a layout requested while hidden until the container has a size, then lays out once at it", async () => {
    const reader = await mountedAndSettledRecordingItemLayouts()
    const layouts = countLayouts(reader)

    viewportSizesAtItemLayouts = []
    vi.useFakeTimers()
    setTestViewport(hidden)
    reader.settings.update({ pageHorizontalMargin: 10 })
    await vi.advanceTimersByTimeAsync(RESIZE_DEBOUNCE * 2)

    expect(layouts()).toBe(0)
    expect(viewportSizesAtItemLayouts).toEqual([])
    expect(reader.spine.isLayoutCurrent()).toBe(false)

    setTestViewport({ width: 120, height: 200 })
    notifyResize()
    await vi.advanceTimersByTimeAsync(RESIZE_DEBOUNCE * 2)

    expect(layouts()).toBe(1)
    expect(reader.viewport.value.width).toBe(120)
    expect(reader.spine.isLayoutCurrent()).toBe(true)
    expect(viewportSizesAtItemLayouts).not.toEqual([])
  })

  it("stops a layout the container is hidden during, and runs it again once the container is shown at the size it had", async () => {
    const reader = await mountedAndSettledRecordingItemLayouts()
    const layouts = countLayouts(reader)

    viewportSizesAtItemLayouts = []
    vi.useFakeTimers()
    // measures the viewport at once, and lays the items out 50 ms later
    reader.settings.update({ pageHorizontalMargin: 10 })
    await vi.advanceTimersByTimeAsync(10)
    setTestViewport(hidden)
    notifyResize()
    await vi.advanceTimersByTimeAsync(RESIZE_DEBOUNCE * 2)

    expect(viewportSizesAtItemLayouts).toEqual([])
    expect(reader.spine.isLayoutCurrent()).toBe(false)

    setTestViewport(defaultTestViewport)
    notifyResize()
    await vi.advanceTimersByTimeAsync(RESIZE_DEBOUNCE * 2)

    // the layout starts again from the measurement, and only it runs
    expect(layouts()).toBe(2)
    expect(reader.spine.isLayoutCurrent()).toBe(true)
    expect(viewportSizesAtItemLayouts).not.toEqual([])
  })

  it("lays every item out for the size the container is shown at, when it is hidden after the layout laid out some of them", async () => {
    const secondItem = holdItemLayout("/page_1.jpg")
    const reader = await mountedAndSettled({
      getRenderer: secondItem.getRenderer,
    })
    const firstItem = reader.spineItemsManager.get(0)

    if (!firstItem) throw new Error("item 0 is missing")

    // The pass lays the first item out at this size, then waits on the second.
    const layoutsOfSecondItemBefore = secondItem.layoutsStarted()

    secondItem.hold()
    reader.layout()
    await vi.waitFor(() => {
      expect(firstItem.value.isDirty, "the first item awaits a layout").toBe(
        false,
      )
      expect(secondItem.layoutsStarted(), "the layouts of the second").toBe(
        layoutsOfSecondItemBefore + 1,
      )
    })

    /**
     * Shown at another size whose pages are not side by side either, so the
     * spine gives the first item the same place: only the size of its pages
     * changes.
     */
    setTestViewport(hidden)
    notifyResize()
    setTestViewport({ width: 150, height: 250 })
    notifyResize()
    secondItem.release()

    await vi.waitFor(() => {
      expect(reader.spine.isLayoutCurrent(), "the layout is current").toBe(true)
    })
    expect(reader.viewport.value.width, "the width laid out at").toBe(150)

    const itemLayouts = () =>
      reader.spineItemsManager.items.map(({ index }) => {
        const { left, width } = reader.spine.getSpineItemSpineLayoutInfo(index)

        return { left, width }
      })
    const itemLayoutsShown = itemLayouts()

    // Laid out again at the same size, from scratch, nothing moves.
    reader.layout()
    await firstValueFrom(reader.layout$.pipe(timeout(2000)))

    expect(itemLayoutsShown, "the items as shown").toEqual(itemLayouts())
  })

  it("lays nothing out when the container is hidden before the browser reports it, and lays out once it is shown", async () => {
    const reader = await mountedAndSettledRecordingItemLayouts()
    const layouts = countLayouts(reader)

    viewportSizesAtItemLayouts = []
    vi.useFakeTimers()
    // measures the viewport at once, and lays the items out 50 ms later
    reader.settings.update({ pageHorizontalMargin: 10 })
    // hidden, with no report yet: the browser has not rendered since
    setTestViewport(hidden)
    await vi.advanceTimersByTimeAsync(RESIZE_DEBOUNCE * 2)

    expect(viewportSizesAtItemLayouts).toEqual([])
    expect(reader.spine.isLayoutCurrent()).toBe(false)

    setTestViewport(defaultTestViewport)
    notifyResize()
    await vi.advanceTimersByTimeAsync(RESIZE_DEBOUNCE * 2)

    expect(layouts()).toBe(2)
    expect(reader.spine.isLayoutCurrent()).toBe(true)
    expect(viewportSizesAtItemLayouts).not.toEqual([])
  })

  it("holds the layout an item's load ends with while hidden, until the container has a size", async () => {
    const secondItem = holdItem("/page_1.jpg")
    const reader = await mountedAndSettledRecordingItemLayouts({
      getRenderer: secondItem.getRenderer,
    })

    viewportSizesAtItemLayouts = []
    vi.useFakeTimers()
    setTestViewport(hidden)
    secondItem.release()
    await vi.advanceTimersByTimeAsync(RESIZE_DEBOUNCE * 2)

    expect(reader.spineItemsManager.get(1)?.value.loadStatus).toBe("loaded")
    expect(viewportSizesAtItemLayouts).toEqual([])
    expect(reader.spine.isLayoutCurrent()).toBe(false)

    setTestViewport(defaultTestViewport)
    notifyResize()
    await vi.advanceTimersByTimeAsync(RESIZE_DEBOUNCE * 2)

    expect(reader.spine.isLayoutCurrent()).toBe(true)
    expect(viewportSizesAtItemLayouts).not.toEqual([])
  })

  it("neither loads nor unloads a spine item while hidden, and loads the one in view once shown", async () => {
    // from the start, so the loader's wait runs on the fake clock
    vi.useFakeTimers()

    // with no animation, the turn lands at once, and the viewport is free
    const reader = createTestReader({
      numberOfAdjacentSpineItemToPreLoad: 0,
      pageTurnAnimation: "none",
    })
    const loadStatusOf = (spineItemIndex: number) =>
      reader.spineItemsManager.get(spineItemIndex)?.value.loadStatus

    recordViewportSizeAtItemLayouts(reader)
    mountTestReader(reader)
    await vi.runAllTimersAsync()

    expect([loadStatusOf(0), loadStatusOf(1)]).toEqual(["loaded", "idle"])

    setTestViewport(hidden)
    notifyResize()
    reader.navigation.turnRight()
    await vi.advanceTimersByTimeAsync(LOADER_DEBOUNCE * 3)

    expect([loadStatusOf(0), loadStatusOf(1)]).toEqual(["loaded", "idle"])

    setTestViewport(defaultTestViewport)
    notifyResize()
    await vi.advanceTimersByTimeAsync(LOADER_DEBOUNCE * 3)

    expect([loadStatusOf(0), loadStatusOf(1)]).toEqual(["idle", "loaded"])
  })
})

describe("Given the spreadMode setting", () => {
  it("shows the spread from the first layout when the reader is created with always, in portrait", async () => {
    const reader = createTestReader({ spreadMode: "always" })
    const layouts = countLayouts(reader)

    mountTestReader(reader)

    const { begin, end } = await settledOn(reader)

    expect(layouts()).toBe(1)
    expect(reader.viewport.value.isSpread).toBe(true)
    expect([begin.spineItemIndex, end.spineItemIndex]).toEqual([0, 1])
  })

  it("lays out once when it changes, and shows the spread it asks for", async () => {
    const reader = await mountedAndSettled()
    const layouts = countLayouts(reader)

    expect(reader.viewport.value.isSpread).toBe(false)

    reader.settings.update({ spreadMode: "always" })

    expect(layouts()).toBe(1)
    expect(reader.viewport.value.isSpread).toBe(true)
    expect(await settledOnSpread(reader)).toEqual([0, 1])
  })

  it("lays out once when it becomes never over a spread, and shows one page at a time", async () => {
    // landscape, so the reader opens on a spread
    setTestViewport({ width: 400, height: 200 })

    const reader = await mountedAndSettled()
    const layouts = countLayouts(reader)

    expect(reader.viewport.value.isSpread).toBe(true)

    reader.settings.update({ spreadMode: "never" })

    expect(layouts()).toBe(1)
    expect(reader.viewport.value.isSpread).toBe(false)
    expect(await secondItemAfterLayout(reader)).toEqual({ left: 400, top: 0 })
  })

  it("keeps one page at a time in landscape when it is never", async () => {
    const reader = await mountedAndSettled({ spreadMode: "never" })
    const layouts = countLayouts(reader)

    setTestViewport({ width: 400, height: 200 })
    reader.layout()

    expect(layouts()).toBe(1)
    expect(reader.viewport.value.isSpread).toBe(false)
    expect(await secondItemAfterLayout(reader)).toEqual({ left: 400, top: 0 })
  })

  it("reads back as it was given, whatever the viewport shows", async () => {
    const reader = await mountedAndSettled()

    setTestViewport({ width: 400, height: 200 })
    reader.layout()

    expect(reader.viewport.value.isSpread).toBe(true)
    expect(reader.settings.values.spreadMode).toBe("auto")

    reader.settings.update({ spreadMode: "never" })

    expect(reader.viewport.value.isSpread).toBe(false)
    expect(reader.settings.values.spreadMode).toBe("never")
  })
})

describe("Given a zoomed reader", () => {
  it("still lays out for a resize the container reported before the zoom changed", async () => {
    const reader = createZoomableTestReader()

    mountTestReader(reader)
    await settledOn(reader)

    expect(reader.spine.getSpineItemSpineLayoutInfo(1).left).toBe(100)

    vi.useFakeTimers()
    // still portrait, so the pages stay single
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
  it("lays out once when pageTurnDirection changes, and stacks the items", async () => {
    const reader = await mountedAndSettled()
    const layouts = countLayouts(reader)

    expect(reader.spine.getSpineItemSpineLayoutInfo(1).left).toBe(100)

    reader.settings.update({ pageTurnDirection: "vertical" })

    expect(layouts()).toBe(1)
    expect(await secondItemAfterLayout(reader)).toEqual({ left: 0, top: 200 })
  })

  it("lays out once when a page margin changes", async () => {
    const reader = await mountedAndSettled()
    const layouts = countLayouts(reader)

    reader.settings.update({ pageHorizontalMargin: 10 })

    expect(layouts()).toBe(1)
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
