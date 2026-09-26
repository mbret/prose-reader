import { describe, expect, it, vi } from "vitest"
import { Context } from "../context/Context"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { createTestManifest } from "../tests/utils"
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
