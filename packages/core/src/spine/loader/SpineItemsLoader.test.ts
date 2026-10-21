import { BehaviorSubject, type Observable, of, Subject } from "rxjs"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Context } from "../../context/Context"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { createTestManifest, waitFor } from "../../tests/utils"
import { Viewport } from "../../viewport/Viewport"
import type { SpineLocator } from "../locator/SpineLocator"
import type { SpineItemsManager } from "../SpineItemsManager"
import type { SpineLayout } from "../SpineLayout"
import {
  SpinePosition,
  type SpinePosition as SpinePositionType,
} from "../types"
import { SpineItemsLoader } from "./SpineItemsLoader"

type VisibleRange = { beginIndex: number; endIndex: number }

/** The loader's debounce, and a little more for it to run. */
const LOADER_DEBOUNCE_MS = 150

let cleanup: (() => void) | undefined

afterEach(() => {
  cleanup?.()
  cleanup = undefined
})

/**
 * A mounted loader over two items, reading the visible range from
 * `getVisibleRange` for the position it is given, without preloading.
 */
const createHarness = ({
  getVisibleRange,
  isLayoutCurrent$ = of(true),
}: {
  getVisibleRange: (position: SpinePositionType) => VisibleRange
  isLayoutCurrent$?: Observable<boolean>
}) => {
  const context = new Context(createTestManifest())

  // the loader only runs once mounted
  context.update({ rootElement: document.createElement("div") })

  const settings = new ReaderSettingsManager(
    { numberOfAdjacentSpineItemToPreLoad: 0 },
    context,
  )
  const viewport = new Viewport(context, settings)
  const spineLayoutTrigger = new Subject<void>()

  vi.spyOn(viewport.value.element, "clientWidth", "get").mockReturnValue(100)
  vi.spyOn(viewport.value.element, "clientHeight", "get").mockReturnValue(100)
  viewport.layout()

  const items = [
    { load: vi.fn(), unload: vi.fn() },
    { load: vi.fn(), unload: vi.fn() },
  ]
  // Cast: the loader only reads `items` and calls `load` / `unload` here.
  const spineItemsManager = { items } as unknown as SpineItemsManager

  const getVisibleSpineItemsFromPosition = vi.fn(
    ({ position }: { position: SpinePositionType }) =>
      getVisibleRange(position),
  )
  // Cast: these tests exercise the loader's trigger wiring, not locator internals.
  const spineLocator = {
    getVisibleSpineItemsFromPosition,
  } as unknown as SpineLocator

  // Cast: the loader only subscribes to `layout$` in these tests.
  const spineLayout = {
    layout$: spineLayoutTrigger.asObservable(),
  } as unknown as SpineLayout

  const moveTo = (x: number) => {
    context.bridgeEvent.positionSubject.next(new SpinePosition({ x, y: 0 }))
  }

  moveTo(0)

  const loader = new SpineItemsLoader(
    context,
    spineItemsManager,
    spineLocator,
    settings,
    spineLayout,
    viewport,
    isLayoutCurrent$,
  )

  cleanup = () => {
    loader.destroy()
    context.destroy()
    settings.destroy()
    viewport.destroy()
    spineLayoutTrigger.complete()
  }

  return {
    items,
    viewport,
    moveTo,
    getVisibleSpineItemsFromPosition,
    clearCalls: () => {
      vi.clearAllMocks()
    },
  }
}

describe("SpineItemsLoader", () => {
  describe("Given the viewport geometry changes without a position change", () => {
    it("reloads visible spine items from the current relative viewport", async () => {
      let visibleRange = { beginIndex: 0, endIndex: 0 }
      const {
        items: [item0, item1],
        viewport,
        getVisibleSpineItemsFromPosition,
        clearCalls,
      } = createHarness({ getVisibleRange: () => visibleRange })

      await waitFor(LOADER_DEBOUNCE_MS)

      expect(item0?.load).toHaveBeenCalled()
      expect(item1?.unload).toHaveBeenCalled()

      clearCalls()
      visibleRange = { beginIndex: 1, endIndex: 1 }

      viewport.layout()

      await waitFor(LOADER_DEBOUNCE_MS)

      expect(getVisibleSpineItemsFromPosition).toHaveBeenCalled()
      expect(item0?.unload).toHaveBeenCalled()
      expect(item1?.load).toHaveBeenCalled()
    })
  })

  describe("Given a layout in progress", () => {
    /**
     * A layout moves the items before it restores the navigation, so until it
     * is current the position and the items' places disagree: here the
     * position still names the first item while the second has taken its
     * place.
     */
    it("neither loads nor unloads until the layout is current, then measures from the position it restored", async () => {
      const isLayoutCurrent$ = new BehaviorSubject(false)
      const {
        items: [item0, item1],
        moveTo,
      } = createHarness({
        getVisibleRange: ({ x }) =>
          x === 0
            ? { beginIndex: 0, endIndex: 0 }
            : { beginIndex: 1, endIndex: 1 },
        isLayoutCurrent$,
      })

      await waitFor(LOADER_DEBOUNCE_MS)

      // the layout restores the navigation where the second item now is
      moveTo(100)

      await waitFor(LOADER_DEBOUNCE_MS)

      for (const item of [item0, item1]) {
        expect(item?.load).not.toHaveBeenCalled()
        expect(item?.unload).not.toHaveBeenCalled()
      }

      isLayoutCurrent$.next(true)

      expect(item1?.load).toHaveBeenCalled()
      expect(item0?.unload).toHaveBeenCalled()
      expect(item0?.load).not.toHaveBeenCalled()
    })
  })
})
