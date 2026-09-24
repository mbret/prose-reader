import { describe, expect, it, vi } from "vitest"
import type { Reader } from "../../reader"
import { ZoomController } from "./ZoomController"

const createControlledReader = () => {
  const viewportElement = document.createElement("div")
  const scrollElement = document.createElement("div")
  const layout = vi.fn()

  const reader = {
    layout,
    navigation: {
      scrollNavigationController: {
        value: {
          element: scrollElement,
        },
      },
    },
    settings: {
      values: {
        computedPageTurnMode: "controlled",
      },
    },
    viewport: {
      value: {
        element: viewportElement,
      },
    },
  }

  // Cast: ZoomController only touches this minimal Reader surface in these tests.
  return { reader: reader as unknown as Reader, layout }
}

describe("ZoomController", () => {
  describe("Given zoom changes the viewport transform", () => {
    it("lays the reader out, since what is visible changed", () => {
      const { reader, layout } = createControlledReader()
      const controller = new ZoomController(reader)

      controller.enter()
      layout.mockClear()

      controller.scaleAt(2)
      controller.destroy()

      expect(layout).toHaveBeenCalledTimes(1)
    })
  })
})
