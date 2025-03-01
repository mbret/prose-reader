import { firstValueFrom } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import { HookManager, SpineItem } from "../.."
import { Context } from "../../context/Context"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { SpineItemsManager } from "../SpineItemsManager"
import { SpineLayout } from "../SpineLayout"
import { getVisibleSpineItemsFromPosition } from "./getVisibleSpineItemsFromPosition"

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

const createSpineItem = (
  item: (typeof singlePageItems)[number],
  index: number,
  settings: ReaderSettingsManager,
  hookManager: HookManager,
) => {
  const containerElement = document.createElement("div")

  const spineItem = new SpineItem(
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    {} as any,
    containerElement,
    context,
    settings,
    hookManager,
    index,
  )

  vi.spyOn(spineItem.layout, "layoutInfo", "get").mockReturnValue({
    // left: item.left,
    // top: item.top,
    width: item.width,
    height: item.height,
    // right: item.right,
    // bottom: item.bottom,
    // x: item.left,
    // y: item.top,
  })

  return spineItem
}

describe("Given single page items and no spread", () => {
  describe("when position is in half of the first item", () => {
    describe("and threshold of 0.51", () => {
      it("should not recognize second item", () => {
        const context = new Context()
        const settings = new ReaderSettingsManager({}, context)
        const spineItemsManager = new SpineItemsManager(context, settings)
        const hookManager = new HookManager()
        const spineLayout = new SpineLayout(
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          spineItemsManager as any,
          context,
          settings,
        )

        context.update({
          visibleAreaRect: {
            height: 100,
            width: 100,
            x: 0,
            y: 0,
          },
        })

        const spineItems = singlePageItems.map((item, index) =>
          createSpineItem(item, index, settings, hookManager),
        )

        spineItemsManager.addMany(spineItems)

        spineLayout.layout()

        const { beginIndex, endIndex } =
          getVisibleSpineItemsFromPosition({
            context: context,
            position: { x: 50, y: 0 },
            settings,
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
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
        const spineItemsManager = new SpineItemsManager(context, settings)
        const hookManager = new HookManager()
        const spineLayout = new SpineLayout(
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          spineItemsManager as any,
          context,
          settings,
        )

        context.update({
          visibleAreaRect: {
            height: 100,
            width: 100,
            x: 0,
            y: 0,
          },
        })

        const spineItems = singlePageItems.map((item, index) =>
          createSpineItem(item, index, settings, hookManager),
        )

        spineItemsManager.addMany(spineItems)

        spineLayout.layout()

        const { beginIndex, endIndex } =
          getVisibleSpineItemsFromPosition({
            context: context,
            position: { x: 50, y: 0 },
            settings,
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
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
      it("should recognize second item foobar", async () => {
        const context = new Context()
        const settings = new ReaderSettingsManager({}, context)
        const spineItemsManager = new SpineItemsManager(context, settings)
        const hookManager = new HookManager()
        const spineLayout = new SpineLayout(
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          spineItemsManager as any,
          context,
          settings,
        )

        context.update({
          visibleAreaRect: {
            height: 100,
            width: 100,
            x: 0,
            y: 0,
          },
        })

        const spineItems = singlePageItems.map((item, index) =>
          createSpineItem(item, index, settings, hookManager),
        )

        spineItemsManager.addMany(spineItems)

        spineLayout.layout()

        await firstValueFrom(spineLayout.layout$)

        const { beginIndex, endIndex } =
          getVisibleSpineItemsFromPosition({
            context: context,
            position: { x: 50, y: 0 },
            settings,
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
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
