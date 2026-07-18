import { firstValueFrom } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import { HookManager } from "../.."
import { Context } from "../../context/Context"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import {
  createTestManifest,
  createTestManifestSpineItems,
} from "../../tests/utils"
import { Viewport } from "../../viewport/Viewport"
import { SpineItemsManager } from "../SpineItemsManager"
import { SpineItemsObserver } from "../SpineItemsObserver"
import { SpineLayout } from "../SpineLayout"
import { SpinePosition } from "../types"
import { getVisibleSpineItemsFromPosition } from "./getVisibleSpineItemsFromPosition"

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

const createTestEnvironment = () => {
  const context = new Context(
    createTestManifest({
      spineItems: createTestManifestSpineItems(singlePageItems.length),
    }),
  )
  const settings = new ReaderSettingsManager({}, context)
  const hookManager = new HookManager()
  const viewport = new Viewport(context, settings)
  const spineItemsManager = new SpineItemsManager(
    context,
    settings,
    hookManager,
    viewport,
  )
  const spineItemsObserver = new SpineItemsObserver(spineItemsManager)
  const spineLayout = new SpineLayout(
    // biome-ignore lint/suspicious/noExplicitAny: TODO
    spineItemsManager as any,
    spineItemsObserver,
    context,
    settings,
    viewport,
  )

  vi.spyOn(viewport.value.element, "clientWidth", "get").mockReturnValue(100)
  vi.spyOn(viewport.value.element, "clientHeight", "get").mockReturnValue(100)

  viewport.layout()

  spineItemsManager.items.forEach((spineItem, index) => {
    vi.spyOn(spineItem, "layoutInfo", "get").mockReturnValue({
      // biome-ignore lint/style/noNonNullAssertion: index in range
      width: singlePageItems[index]!.width,
      // biome-ignore lint/style/noNonNullAssertion: index in range
      height: singlePageItems[index]!.height,
    })
  })

  return { settings, spineItemsManager, spineLayout, viewport }
}

describe("Given single page items and no spread", () => {
  describe("when position is in half of the first item", () => {
    describe("and threshold of 0.51", () => {
      it("should not recognize second item", () => {
        const { settings, spineItemsManager, spineLayout, viewport } =
          createTestEnvironment()

        spineLayout.layout()

        const { beginIndex, endIndex } =
          getVisibleSpineItemsFromPosition({
            position: new SpinePosition({ x: 50, y: 0 }),
            settings,
            // biome-ignore lint/suspicious/noExplicitAny: TODO
            spineItemsManager: spineItemsManager as any,
            threshold: { type: "percentage", value: 0.51 },
            restrictToScreen: true,
            spineLayout,
            viewport,
          }) ?? {}

        expect(beginIndex).toBe(0)
        expect(endIndex).toBe(0)
      })
    })

    describe("and threshold of 0.50", () => {
      it("should not recognize second item", () => {
        const { settings, spineItemsManager, spineLayout, viewport } =
          createTestEnvironment()

        spineLayout.layout()

        const { beginIndex, endIndex } =
          getVisibleSpineItemsFromPosition({
            position: new SpinePosition({ x: 50, y: 0 }),
            settings,
            // biome-ignore lint/suspicious/noExplicitAny: TODO
            spineItemsManager: spineItemsManager as any,
            threshold: { type: "percentage", value: 0.5 },
            restrictToScreen: true,
            spineLayout,
            viewport,
          }) ?? {}

        expect(beginIndex).toBe(0)
        expect(endIndex).toBe(0)
      })
    })

    describe("and threshold of 0.49", () => {
      it("should recognize second item", async () => {
        const { settings, spineItemsManager, spineLayout, viewport } =
          createTestEnvironment()

        spineLayout.layout()

        await firstValueFrom(spineLayout.layout$)

        const { beginIndex, endIndex } =
          getVisibleSpineItemsFromPosition({
            position: new SpinePosition({ x: 50, y: 0 }),
            settings,
            // biome-ignore lint/suspicious/noExplicitAny: TODO
            spineItemsManager: spineItemsManager as any,
            threshold: { type: "percentage", value: 0.49 },
            restrictToScreen: true,
            spineLayout,
            viewport,
          }) ?? {}

        expect(beginIndex).toBe(0)
        expect(endIndex).toBe(1)
      })
    })
  })
})
