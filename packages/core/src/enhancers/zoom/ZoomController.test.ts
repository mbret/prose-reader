import { describe, expect, it, vi } from "vitest"
import type { Reader } from "../../reader"
import { ZoomController } from "./ZoomController"

const createControlledReader = () => {
  const viewportElement = document.createElement("div")
  const scrollElement = document.createElement("div")
  const viewportLayout = vi.fn()

  const reader = {
    layout: vi.fn(),
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
      layout: viewportLayout,
      value: {
        element: viewportElement,
      },
    },
  }

  // Cast: ZoomController only touches this minimal Reader surface in these tests.
  return { reader: reader as unknown as Reader, viewportLayout }
}

describe("ZoomController", () => {
  describe("Given zoom changes the viewport transform", () => {
    it("notifies viewport layout dependents", () => {
      const { reader, viewportLayout } = createControlledReader()
      const controller = new ZoomController(reader)

      controller.enter()
      viewportLayout.mockClear()

      controller.scaleAt(2)
      controller.destroy()

      expect(viewportLayout).toHaveBeenCalledTimes(1)
    })
  })
})
