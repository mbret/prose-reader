/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest"
import { getVisibleSpineItemsFromPosition } from "./getVisibleSpineItemsFromPosition"
import { Context } from "../../context/Context"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { SpineItemsManagerMock } from "../../navigation/tests/SpineItemsManagerMock"
import { SpineLayout } from "../SpineLayout"

const context = new Context()

context.update({
  visibleAreaRect: {
    height: 100,
    width: 100,
    x: 0,
    y: 0,
  },
})

const singlePageItems = [
  {
    bottom: 100,
    height: 100,
    left: 0,
    right: 100,
    top: 0,
    width: 100,
  },
  {
    bottom: 100,
    height: 100,
    left: 100,
    right: 200,
    top: 0,
    width: 100,
  },
]

describe("Given single page items and no spread", () => {
  describe("when position is in half of the first item", () => {
    describe("and threshold of 0.51", () => {
      it("should not recognize second item", () => {
        const context = new Context()
        const settings = new ReaderSettingsManager({}, context)
        const spineItemsManager = new SpineItemsManagerMock()
        const spineLayout = new SpineLayout(
          spineItemsManager as any,
          context,
          settings,
        )

        spineItemsManager.load(singlePageItems)

        const { beginIndex, endIndex } =
          getVisibleSpineItemsFromPosition({
            context: context,
            position: { x: 50, y: 0 },
            settings,
            spineItemsManager: spineItemsManager as any,
            threshold: 0.51,
            restrictToScreen: true,
            spineLayout,
          }) ?? {}

        expect(beginIndex).toBe(0)
        expect(endIndex).toBe(0)
      })
    })

    describe("and threshold of 0.50", () => {
      it("should not recognize second item", () => {
        const context = new Context()
        const settings = new ReaderSettingsManager({}, context)
        const spineItemsManager = new SpineItemsManagerMock()
        const spineLayout = new SpineLayout(
          spineItemsManager as any,
          context,
          settings,
        )

        spineItemsManager.load(singlePageItems)

        const { beginIndex, endIndex } =
          getVisibleSpineItemsFromPosition({
            context: context,
            position: { x: 50, y: 0 },
            settings,
            spineItemsManager: spineItemsManager as any,
            threshold: 0.5,
            restrictToScreen: true,
            spineLayout,
          }) ?? {}

        expect(beginIndex).toBe(0)
        expect(endIndex).toBe(0)
      })
    })

    describe("and threshold of 0.49", () => {
      it("should recognize second item", () => {
        const context = new Context()
        const settings = new ReaderSettingsManager({}, context)
        const spineItemsManager = new SpineItemsManagerMock()
        const spineLayout = new SpineLayout(
          spineItemsManager as any,
          context,
          settings,
        )

        spineItemsManager.load(singlePageItems)

        const { beginIndex, endIndex } =
          getVisibleSpineItemsFromPosition({
            context: context,
            position: { x: 50, y: 0 },
            settings,
            spineItemsManager: spineItemsManager as any,
            threshold: 0.49,
            restrictToScreen: true,
            spineLayout,
          }) ?? {}

        expect(beginIndex).toBe(0)
        expect(endIndex).toBe(1)
      })
    })
  })
})
