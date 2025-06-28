import { describe, expect, it } from "vitest"
import { Context } from "../../context/Context"
import { Viewport } from "../../viewport/Viewport"
import { ViewportSlicePosition } from "../../viewport/types"
import { SpinePosition } from "../types"
import { getItemVisibilityForPosition } from "./getItemVisibilityForPosition"

const context = new Context()
const viewport = new Viewport(context)

context.update({
  visibleAreaRect: {
    height: 384,
    width: 505,
    x: 0,
    y: 0,
  },
})

describe("Given an item that is one page on spread", () => {
  describe("when viewport is at less than the screen threshold", () => {
    describe("and restrictToScreen is false", () => {
      it("should recognize item", () => {
        const { visible } =
          getItemVisibilityForPosition({
            itemPosition: {
              bottom: 384,
              height: 384,
              left: -505,
              right: -252.5,
              top: 0,
              width: 252.5,
            },
            threshold: { type: "percentage", value: 0.3 },
            viewportPosition: ViewportSlicePosition.from(
              new SpinePosition({ x: -380, y: 0 }),
              viewport.absoluteViewport,
            ),
            restrictToScreen: false,
          }) ?? {}

        expect(visible).toBe(true)
      })
    })
  })

  describe("when viewport is at less than the screen threshold", () => {
    describe("and restrictToScreen is true", () => {
      it("should recognize item", () => {
        const { visible } =
          getItemVisibilityForPosition({
            itemPosition: {
              bottom: 384,
              height: 384,
              left: -505,
              right: -252.5,
              top: 0,
              width: 252.5,
            },
            threshold: { type: "percentage", value: 0.3 },
            viewportPosition: ViewportSlicePosition.from(
              new SpinePosition({ x: -380, y: 0 }),
              viewport.absoluteViewport,
            ),
            restrictToScreen: true,
          }) ?? {}

        expect(visible).toBe(false)
      })
    })
  })

  describe("when viewport is at more than the screen threshold", () => {
    describe("and restrictToScreen is true", () => {
      it("should recognize item", () => {
        const { visible } =
          getItemVisibilityForPosition({
            itemPosition: {
              bottom: 384,
              height: 384,
              left: -505,
              right: -252.5,
              top: 0,
              width: 252.5,
            },
            threshold: { type: "percentage", value: 0.3 },
            viewportPosition: ViewportSlicePosition.from(
              new SpinePosition({ x: -450, y: 0 }),
              viewport.absoluteViewport,
            ),
            restrictToScreen: true,
          }) ?? {}

        expect(visible).toBe(true)
      })
    })
  })
})
