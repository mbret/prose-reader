import { describe, expect, it, vi } from "vitest"
import { Context } from "../../context/Context"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { ViewportSlicePosition } from "../../viewport/types"
import { Viewport } from "../../viewport/Viewport"
import { SpinePosition } from "../types"
import { getItemVisibilityForPosition } from "./getItemVisibilityForPosition"

const context = new Context()
const settingsManager = new ReaderSettingsManager({}, context)
const viewport = new Viewport(context, settingsManager)

vi.spyOn(viewport.value.element, "clientWidth", "get").mockReturnValue(505)
vi.spyOn(viewport.value.element, "clientHeight", "get").mockReturnValue(384)

viewport.layout()

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
