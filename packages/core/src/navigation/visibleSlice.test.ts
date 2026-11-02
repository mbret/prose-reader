// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { SpinePosition } from "../spine/types"
import {
  createTestReader,
  installReaderTestEnvironment,
  mountTestReader,
  setTestViewport,
} from "../tests/readerHarness"

installReaderTestEnvironment()

/**
 * A mounted reader of a 300x400 viewport, rendered at half its size, as a zoom
 * out does: the scale is the viewport's rendered width over its layout width.
 */
const createReaderZoomedOutToHalf = (
  pageTurnMode: "controlled" | "scrollable",
) => {
  setTestViewport({ width: 300, height: 400 })

  const reader = createTestReader({ pageTurnMode })

  mountTestReader(reader)

  vi.spyOn(
    reader.viewport.value.element,
    "getBoundingClientRect",
  ).mockReturnValue(new DOMRect(0, 0, 150, 200))

  expect(reader.settings.values.computedPageTurnMode).toBe(pageTurnMode)
  expect(reader.viewport.absoluteViewport).toMatchObject({
    width: 300,
    height: 400,
  })
  expect(reader.viewport.scaleFactor).toBe(0.5)

  return reader
}

describe("reader.navigation.getVisibleSlice()", () => {
  describe("Given a viewport zoomed out to half its size", () => {
    /**
     * A scroll keeps the navigation at the top of the screen, at any scale.
     */
    it("scrolled, is the relative viewport from the position", () => {
      const reader = createReaderZoomedOutToHalf("scrollable")

      expect(
        reader.navigation.getVisibleSlice(new SpinePosition({ x: 0, y: 1000 })),
      ).toMatchObject({ x: 0, y: 1000, width: 600, height: 800 })
    })

    /**
     * A zoom scales the viewport around its center, and leaves the
     * navigation where it is.
     */
    it("paginated, is the relative viewport centered on the absolute one at the position", () => {
      const reader = createReaderZoomedOutToHalf("controlled")

      expect(
        reader.navigation.getVisibleSlice(new SpinePosition({ x: 900, y: 0 })),
      ).toMatchObject({ x: 750, y: -200, width: 600, height: 800 })
    })
  })
})
