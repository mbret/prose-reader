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
