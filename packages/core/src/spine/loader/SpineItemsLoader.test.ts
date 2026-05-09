import { Subject } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import { Context } from "../../context/Context"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { waitFor } from "../../tests/utils"
import { Viewport } from "../../viewport/Viewport"
import type { SpineLocator } from "../locator/SpineLocator"
import type { SpineItemsManager } from "../SpineItemsManager"
import type { SpineLayout } from "../SpineLayout"
import { SpinePosition } from "../types"
import { SpineItemsLoader } from "./SpineItemsLoader"

describe("SpineItemsLoader", () => {
  describe("Given the viewport geometry changes without a position change", () => {
    it("reloads visible spine items from the current relative viewport", async () => {
      const context = new Context()
      const settings = new ReaderSettingsManager(
        { numberOfAdjacentSpineItemToPreLoad: 0 },
        context,
      )
      const viewport = new Viewport(context, settings)
      const spineLayoutTrigger = new Subject<void>()

      vi.spyOn(viewport.value.element, "clientWidth", "get").mockReturnValue(
        100,
      )
      vi.spyOn(viewport.value.element, "clientHeight", "get").mockReturnValue(
        100,
      )
      viewport.layout()

      const item0 = { load: vi.fn(), unload: vi.fn() }
      const item1 = { load: vi.fn(), unload: vi.fn() }
      const spineItemsManager = {
        items: [item0, item1],
      }
      // Cast: the loader only reads `items` and calls `load` / `unload` here.
      const typedSpineItemsManager =
        spineItemsManager as unknown as SpineItemsManager

      let visibleRange = { beginIndex: 0, endIndex: 0 }
      const spineLocator = {
        getVisibleSpineItemsFromPosition: vi.fn(() => visibleRange),
      }
      // Cast: this test exercises the loader's trigger wiring, not locator internals.
      const typedSpineLocator = spineLocator as unknown as SpineLocator

      const spineLayout = {
        layout$: spineLayoutTrigger.asObservable(),
      }
      // Cast: the loader only subscribes to `layout$` in this test.
      const typedSpineLayout = spineLayout as unknown as SpineLayout

      context.bridgeEvent.positionSubject.next(
        new SpinePosition({ x: 0, y: 0 }),
      )

      const loader = new SpineItemsLoader(
        context,
        typedSpineItemsManager,
        typedSpineLocator,
        settings,
        typedSpineLayout,
        viewport,
      )

      await waitFor(150)

      expect(item0.load).toHaveBeenCalled()
      expect(item1.unload).toHaveBeenCalled()

      item0.load.mockClear()
      item0.unload.mockClear()
      item1.load.mockClear()
      item1.unload.mockClear()
      spineLocator.getVisibleSpineItemsFromPosition.mockClear()

      visibleRange = { beginIndex: 1, endIndex: 1 }

      viewport.layout()

      await waitFor(150)
      loader.destroy()
      context.destroy()
      settings.destroy()
      viewport.destroy()
      spineLayoutTrigger.complete()

      expect(spineLocator.getVisibleSpineItemsFromPosition).toHaveBeenCalled()
      expect(item0.unload).toHaveBeenCalled()
      expect(item1.load).toHaveBeenCalled()
    })
  })
})
