import type { Manifest } from "@prose-reader/shared"
import { firstValueFrom, Subject } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import { Context } from "../context/Context"
import { HookManager } from "../hooks/HookManager"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import {
  createTestManifest,
  createTestManifestSpineItems,
} from "../tests/utils"
import { Viewport } from "../viewport/Viewport"
import { SpineItemsManager } from "./SpineItemsManager"
import { SpineItemsObserver } from "./SpineItemsObserver"
import { SpineLayout } from "./SpineLayout"

const createPrePaginatedManifest = (
  readingDirection: Manifest["readingDirection"],
  items: Array<Partial<Manifest["spineItems"][number]> | undefined>,
): Manifest => ({
  filename: "",
  items: [],
  readingDirection,
  renditionLayout: "pre-paginated",
  renditionSpread: "auto",
  spineItems: createTestManifestSpineItems(items),
  title: "",
})

const createSpreadModeTestEnvironment = ({
  pageHeight,
  pageWidth,
  readingDirection,
  items,
}: {
  pageHeight: number
  pageWidth: number
  readingDirection: Manifest["readingDirection"]
  items: Array<Partial<Manifest["spineItems"][number]> | undefined>
}) => {
  const context = new Context(
    createPrePaginatedManifest(readingDirection, items),
  )
  const settings = new ReaderSettingsManager({ spreadMode: "always" }, context)
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
    spineItemsManager,
    spineItemsObserver,
    context,
    settings,
    viewport,
  )
  const layoutRequests: Array<{
    blankPagePosition: "before" | "after" | "none"
    id: string
    minimumWidth: number
  }> = []

  hookManager.register(
    "item.onBeforeLayout",
    ({ blankPagePosition, item, minimumWidth }) => {
      layoutRequests.push({
        blankPagePosition,
        id: item.id,
        minimumWidth,
      })
    },
  )
  vi.spyOn(viewport.value.element, "clientWidth", "get").mockReturnValue(
    pageWidth * 2,
  )
  vi.spyOn(viewport.value.element, "clientHeight", "get").mockReturnValue(
    pageHeight,
  )
  viewport.layout()

  const destroy = () => {
    spineLayout.destroy()
    spineItemsObserver.destroy()
    spineItemsManager.destroy()
    viewport.destroy()
    settings.destroy()
    context.destroy()
  }

  return {
    destroy,
    layoutRequests,
    spineLayout,
  }
}

const createTestSpineLayout = () => {
  const context = new Context(
    createTestManifest({ spineItems: createTestManifestSpineItems(1) }),
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
    spineItemsManager,
    spineItemsObserver,
    context,
    settings,
    viewport,
  )

  vi.spyOn(viewport.value.element, "clientWidth", "get").mockReturnValue(100)
  vi.spyOn(viewport.value.element, "clientHeight", "get").mockReturnValue(100)
  viewport.layout()

  const destroy = () => {
    spineLayout.destroy()
    spineItemsObserver.destroy()
    spineItemsManager.destroy()
    viewport.destroy()
    settings.destroy()
    context.destroy()
  }

  return {
    destroy,
    spineLayout,
  }
}

type ItemSize = { height: number; width: number }

/**
 * Every item layout stays pending until the test completes it, so a pass can be
 * superseded while only part of the spine has been laid out.
 */
const createDeferredSpineLayout = (numberOfItems: number) => {
  const context = new Context(
    createTestManifest({
      spineItems: createTestManifestSpineItems(numberOfItems),
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
    spineItemsManager,
    spineItemsObserver,
    context,
    settings,
    viewport,
  )

  vi.spyOn(viewport.value.element, "clientWidth", "get").mockReturnValue(100)
  vi.spyOn(viewport.value.element, "clientHeight", "get").mockReturnValue(100)
  viewport.layout()

  // Only the newest request per item is live: a superseded pass is unsubscribed,
  // so its pending layout is abandoned rather than completed.
  const pendingLayouts: (Subject<ItemSize> | undefined)[] =
    spineItemsManager.items.map(() => undefined)

  spineItemsManager.items.forEach((item, itemIndex) => {
    vi.spyOn(item, "layout").mockImplementation(() => {
      const result = new Subject<ItemSize>()

      pendingLayouts[itemIndex] = result

      return result
    })
  })

  const completeItemLayout = (itemIndex: number, size: ItemSize) => {
    const result = pendingLayouts[itemIndex]

    if (!result) throw new Error(`No pending layout for item ${itemIndex}`)

    pendingLayouts[itemIndex] = undefined

    result.next(size)
    result.complete()
  }

  const widths = () =>
    spineItemsManager.items.map(
      (_, itemIndex) =>
        spineLayout.getSpineItemSpineLayoutInfo(itemIndex).width,
    )

  const destroy = () => {
    spineLayout.destroy()
    spineItemsObserver.destroy()
    spineItemsManager.destroy()
    viewport.destroy()
    settings.destroy()
    context.destroy()
  }

  return {
    completeItemLayout,
    destroy,
    spineLayout,
    widths,
  }
}

describe("SpineLayout", () => {
  it("debounces regular external layout requests", async () => {
    vi.useFakeTimers()
    const { destroy, spineLayout } = createTestSpineLayout()

    try {
      const layoutDone = firstValueFrom(spineLayout.layout$)

      spineLayout.layout()

      expect(spineLayout.getSpineItemSpineLayoutInfo(0).width).toBe(0)

      await vi.advanceTimersByTimeAsync(49)

      expect(spineLayout.getSpineItemSpineLayoutInfo(0).width).toBe(0)

      await vi.advanceTimersByTimeAsync(1)
      await layoutDone

      expect(spineLayout.getSpineItemSpineLayoutInfo(0).width).toBe(100)
    } finally {
      destroy()
      vi.useRealTimers()
    }
  })

  it("runs immediate external layout requests without the debounce delay", async () => {
    const { destroy, spineLayout } = createTestSpineLayout()

    try {
      const layoutDone = firstValueFrom(spineLayout.layout$)

      spineLayout.layout({ immediate: true })
      await layoutDone

      expect(spineLayout.getSpineItemSpineLayoutInfo(0).width).toBe(100)
    } finally {
      destroy()
    }
  })

  it("does not publish item layouts until the whole pass completes", async () => {
    const { completeItemLayout, destroy, spineLayout, widths } =
      createDeferredSpineLayout(3)

    try {
      spineLayout.layout({ immediate: true })

      completeItemLayout(0, { height: 100, width: 100 })
      completeItemLayout(1, { height: 100, width: 100 })

      // Two of three items are laid out. Nothing is published yet, so readers
      // still see the previous layout rather than a half updated one.
      expect(widths()).toEqual([0, 0, 0])

      const layoutDone = firstValueFrom(spineLayout.layout$)

      completeItemLayout(2, { height: 100, width: 100 })
      await layoutDone

      expect(widths()).toEqual([100, 100, 100])
    } finally {
      destroy()
    }
  })

  it("keeps the last completed layout readable while a new pass is in flight", async () => {
    const { completeItemLayout, destroy, spineLayout, widths } =
      createDeferredSpineLayout(3)

    try {
      const firstPassDone = firstValueFrom(spineLayout.layout$)

      spineLayout.layout({ immediate: true })
      completeItemLayout(0, { height: 100, width: 100 })
      completeItemLayout(1, { height: 100, width: 100 })
      completeItemLayout(2, { height: 100, width: 100 })
      await firstPassDone

      expect(widths()).toEqual([100, 100, 100])

      // A new pass lays out part of the spine. Until it completes, readers keep
      // seeing the previous layout instead of a mix of the two.
      spineLayout.layout({ immediate: true })
      completeItemLayout(0, { height: 100, width: 50 })
      completeItemLayout(1, { height: 100, width: 50 })

      expect(widths()).toEqual([100, 100, 100])

      // That pass is superseded before completing, so its item layouts are
      // discarded rather than published alongside the next pass's.
      const lastPassDone = firstValueFrom(spineLayout.layout$)

      spineLayout.layout({ immediate: true })
      completeItemLayout(0, { height: 100, width: 25 })
      completeItemLayout(1, { height: 100, width: 25 })
      completeItemLayout(2, { height: 100, width: 25 })
      await lastPassDone

      expect(widths()).toEqual([25, 25, 25])
    } finally {
      destroy()
    }
  })

  it("keeps RTL right-left spread pairs together after an odd number of pages", async () => {
    const { destroy, layoutRequests, spineLayout } =
      createSpreadModeTestEnvironment({
        pageHeight: 100,
        pageWidth: 100,
        readingDirection: "rtl",
        items: [
          undefined,
          undefined,
          undefined,
          { pageSpreadRight: true, renditionLayout: "pre-paginated" },
          { pageSpreadLeft: true, renditionLayout: "pre-paginated" },
        ],
      })

    try {
      const layoutDone = firstValueFrom(spineLayout.layout$)

      spineLayout.layout({ immediate: true })
      await layoutDone

      expect(layoutRequests.find(({ id }) => id === "item-3")).toEqual({
        blankPagePosition: "before",
        id: "item-3",
        minimumWidth: 200,
      })
      expect(layoutRequests.find(({ id }) => id === "item-4")).toEqual({
        blankPagePosition: "none",
        id: "item-4",
        minimumWidth: 100,
      })
      expect(spineLayout.getSpineItemSpineLayoutInfo(3).width).toBe(200)
      expect(spineLayout.getSpineItemSpineLayoutInfo(4).width).toBe(100)
    } finally {
      destroy()
    }
  })

  it("keeps LTR left-right spread pairs together after an odd number of pages", async () => {
    const { destroy, layoutRequests, spineLayout } =
      createSpreadModeTestEnvironment({
        pageHeight: 100,
        pageWidth: 100,
        readingDirection: "ltr",
        items: [
          undefined,
          undefined,
          undefined,
          { pageSpreadLeft: true, renditionLayout: "pre-paginated" },
          { pageSpreadRight: true, renditionLayout: "pre-paginated" },
        ],
      })

    try {
      const layoutDone = firstValueFrom(spineLayout.layout$)

      spineLayout.layout({ immediate: true })
      await layoutDone

      expect(layoutRequests.find(({ id }) => id === "item-3")).toEqual({
        blankPagePosition: "before",
        id: "item-3",
        minimumWidth: 200,
      })
      expect(layoutRequests.find(({ id }) => id === "item-4")).toEqual({
        blankPagePosition: "none",
        id: "item-4",
        minimumWidth: 100,
      })
      expect(spineLayout.getSpineItemSpineLayoutInfo(3).width).toBe(200)
      expect(spineLayout.getSpineItemSpineLayoutInfo(4).width).toBe(100)
    } finally {
      destroy()
    }
  })
})
