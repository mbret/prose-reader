import { afterEach, describe, expect, it, vi } from "vitest"
import { Context } from "../context/Context"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { SpinePosition } from "../spine/types"
import { createTestManifest, holdAnimationFrames } from "../tests/utils"
import { Viewport } from "./Viewport"

/** A viewport laid out at 100 px, whose element sizes the test controls. */
const laidOutViewport = () => {
  const context = new Context(createTestManifest())
  const viewport = new Viewport(context, new ReaderSettingsManager({}, context))
  const { element } = viewport.value
  const clientWidth = vi
    .spyOn(element, "clientWidth", "get")
    .mockReturnValue(100)
  const renderedWidth = (width: number) =>
    vi
      .spyOn(element, "getBoundingClientRect")
      .mockReturnValue(new DOMRect(0, 0, width, 100))

  vi.spyOn(element, "clientHeight", "get").mockReturnValue(100)
  viewport.layout()

  return { viewport, clientWidth, renderedWidth }
}

describe("Given a viewport laid out at a size", () => {
  it("reports the scale it is rendered at", () => {
    const { viewport, renderedWidth } = laidOutViewport()

    renderedWidth(200)

    expect(viewport.scaleFactor).toBe(2)
  })

  it("does not count a resize that has not been laid out yet as a scale", () => {
    const { viewport, clientWidth, renderedWidth } = laidOutViewport()

    // the container grew, and its layout is still waiting for the reader
    clientWidth.mockReturnValue(120)
    renderedWidth(240)

    expect(viewport.value.width).toBe(100)
    expect(viewport.scaleFactor).toBe(2)
  })

  it("reports no scale while it has no rendered size", () => {
    const { viewport, renderedWidth } = laidOutViewport()

    renderedWidth(0)

    expect(viewport.scaleFactor).toBe(1)
  })
})

describe("Given a viewport asked what a size would show", () => {
  const landscape = { width: 800, height: 400 }
  const portrait = { width: 400, height: 800 }

  const createViewport = (manifest = createTestManifest()) => {
    const context = new Context(manifest)
    const settings = new ReaderSettingsManager({}, context)

    return { viewport: new Viewport(context, settings), settings }
  }

  it("answers for the book and the current spreadMode setting", () => {
    const { viewport, settings } = createViewport()

    expect(viewport.wouldSpreadAt(landscape)).toBe(true)
    expect(viewport.wouldSpreadAt(portrait)).toBe(false)

    settings.update({ spreadMode: "always" })

    expect(viewport.wouldSpreadAt(portrait)).toBe(true)

    settings.update({ spreadMode: "never" })

    expect(viewport.wouldSpreadAt(landscape)).toBe(false)
  })

  it("never spreads a book that does not allow it", () => {
    const { viewport, settings } = createViewport(
      createTestManifest({ renditionSpread: "none" }),
    )

    settings.update({ spreadMode: "always" })

    expect(viewport.wouldSpreadAt(landscape)).toBe(false)
  })

  it("is the rule its own layout applies", () => {
    const { viewport } = createViewport()
    const { element } = viewport.value

    vi.spyOn(element, "clientWidth", "get").mockReturnValue(landscape.width)
    vi.spyOn(element, "clientHeight", "get").mockReturnValue(landscape.height)
    viewport.layout()

    expect(viewport.value.isSpread).toBe(viewport.wouldSpreadAt(landscape))
    expect(viewport.value.isSpread).toBe(true)
  })
})

describe("Given a viewport laid out in a box, asked what it shows of the spine", () => {
  const position = new SpinePosition({ x: 1000, y: 2000 })

  /**
   * The viewport laid out at 100 px in a box at the page's corner unless
   * given another, which can be scrolled, and drawn at `renderedBox` by its
   * transform.
   */
  const viewportRenderedAt = (
    renderedBox: DOMRect,
    {
      layoutBoxCorner = { left: 0, top: 0 },
      layoutBoxScroll = { left: 0, top: 0 },
    } = {},
  ) => {
    const { viewport } = laidOutViewport()
    const { element } = viewport.value
    const layoutBox = document.createElement("div")

    vi.spyOn(layoutBox, "getBoundingClientRect").mockReturnValue(
      new DOMRect(layoutBoxCorner.left, layoutBoxCorner.top, 100, 100),
    )
    Object.defineProperties(layoutBox, {
      scrollLeft: { get: () => layoutBoxScroll.left },
      scrollTop: { get: () => layoutBoxScroll.top },
    })
    Object.defineProperties(element, {
      offsetParent: { get: () => layoutBox },
      offsetLeft: { get: () => 0 },
      offsetTop: { get: () => 0 },
    })
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue(renderedBox)

    return viewport
  }

  it("is the absolute viewport at the position, untransformed", () => {
    const viewport = viewportRenderedAt(new DOMRect(0, 0, 100, 100))

    expect(viewport.getVisibleSlice(position)).toMatchObject({
      x: 1000,
      y: 2000,
      width: 100,
      height: 100,
    })
  })

  it("is the absolute viewport at the position, not rendered", () => {
    const viewport = viewportRenderedAt(new DOMRect(0, 0, 0, 0), {
      layoutBoxCorner: { left: 10, top: 20 },
    })

    expect(viewport.getVisibleSlice(position)).toMatchObject({
      x: 1000,
      y: 2000,
      width: 100,
      height: 100,
    })
  })

  /** As a paginated zoom scales it. */
  it("reaches half a viewport past it on every side, zoomed out to half around its center", () => {
    const viewport = viewportRenderedAt(new DOMRect(25, 25, 50, 50))

    expect(viewport.getVisibleSlice(position)).toMatchObject({
      x: 950,
      y: 1950,
      width: 200,
      height: 200,
    })
  })

  /** As a paginated zoom moves it, with `reader.zoom.move()`. */
  it("follows the transform, zoomed out to half and moved right", () => {
    const viewport = viewportRenderedAt(new DOMRect(50, 25, 50, 50))

    expect(viewport.getVisibleSlice(position)).toMatchObject({
      x: 900,
      y: 1950,
      width: 200,
      height: 200,
    })
  })

  /** As a scrolled zoom scales it, scrolling to keep its center instead. */
  it("starts at the position's height, zoomed out to half from its top", () => {
    const viewport = viewportRenderedAt(new DOMRect(25, 0, 50, 50))

    expect(viewport.getVisibleSlice(position)).toMatchObject({
      x: 950,
      y: 2000,
      width: 200,
      height: 200,
    })
  })

  /** As a scrolled book is: the position counts the scroll already. */
  it("does not count a scroll of the box it is laid out in", () => {
    const viewport = viewportRenderedAt(new DOMRect(0, -300, 100, 100), {
      layoutBoxScroll: { left: 0, top: 300 },
    })

    expect(viewport.getVisibleSlice(position)).toMatchObject({
      x: 1000,
      y: 2000,
      width: 100,
      height: 100,
    })
  })
})

describe("Given a viewport whose element is hidden, then shown", () => {
  /**
   * A resize observer that reports only when the test says, as a browser does
   * once it has laid the page out, and how many are observing.
   */
  const stubResizeObserver = () => {
    const callbacks = new Set<() => void>()

    vi.stubGlobal(
      "ResizeObserver",
      class {
        private readonly report: () => void

        constructor(callback: ResizeObserverCallback) {
          // Cast: the viewport reads no entry, nor the observer it is given.
          this.report = () => callback([], this as unknown as ResizeObserver)
        }

        observe() {
          callbacks.add(this.report)
        }

        unobserve() {
          callbacks.delete(this.report)
        }

        disconnect() {
          callbacks.delete(this.report)
        }
      },
    )

    return {
      reportResize: () => {
        for (const report of [...callbacks]) report()
      },
      observing: () => callbacks.size,
    }
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("reports whether it has a size at once, then each change a resize brings", () => {
    const { reportResize } = stubResizeObserver()
    const context = new Context(createTestManifest())
    const viewport = new Viewport(
      context,
      new ReaderSettingsManager({}, context),
    )
    const { element } = viewport.value
    let size = { width: 100, height: 100 }

    vi.spyOn(element, "clientWidth", "get").mockImplementation(() => size.width)
    vi.spyOn(element, "clientHeight", "get").mockImplementation(
      () => size.height,
    )

    const { runAnimationFrame } = holdAnimationFrames(window)
    const isSized: boolean[] = []

    viewport.isSized$.subscribe((value) => isSized.push(value))

    expect(isSized).toEqual([true])

    // the observer starts in the next frame
    runAnimationFrame()
    // a resize that keeps a size is not a change
    size = { width: 120, height: 100 }
    reportResize()
    // a container with a width but no height has no size either
    size = { width: 120, height: 0 }
    reportResize()
    size = { width: 0, height: 0 }
    reportResize()
    size = { width: 120, height: 100 }
    reportResize()

    expect(isSized).toEqual([true, false, true])
  })

  it("stops observing the element when the reader is destroyed", () => {
    const { observing } = stubResizeObserver()
    const context = new Context(createTestManifest())
    const viewport = new Viewport(
      context,
      new ReaderSettingsManager({}, context),
    )
    const { runAnimationFrame } = holdAnimationFrames(window)
    let isComplete = false

    viewport.isSized$.subscribe({
      complete: () => {
        isComplete = true
      },
    })
    // the observer starts in the next frame
    runAnimationFrame()

    expect(observing()).toBe(1)

    viewport.destroy()

    expect(isComplete).toBe(true)
    expect(observing()).toBe(0)
  })
})
