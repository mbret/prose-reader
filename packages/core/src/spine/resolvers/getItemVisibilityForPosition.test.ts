/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest"
import { Context } from "../../context/Context"
import { getItemVisibilityForPosition } from "./getItemVisibilityForPosition"

const context = new Context()

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
            context,
            itemPosition: {
              bottom: 384,
              height: 384,
              left: -505,
              right: -252.5,
              top: 0,
              width: 252.5,
            },
            threshold: 0.3,
            viewportPosition: { x: -380, y: 0 },
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
            context,
            itemPosition: {
              bottom: 384,
              height: 384,
              left: -505,
              right: -252.5,
              top: 0,
              width: 252.5,
            },
            threshold: 0.3,
            viewportPosition: { x: -380, y: 0 },
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
            context,
            itemPosition: {
              bottom: 384,
              height: 384,
              left: -505,
              right: -252.5,
              top: 0,
              width: 252.5,
            },
            threshold: 0.3,
            viewportPosition: { x: -450, y: 0 },
            restrictToScreen: true,
          }) ?? {}

        expect(visible).toBe(true)
      })
    })
  })
})
