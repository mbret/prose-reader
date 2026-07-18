import type { Manifest } from "@prose-reader/shared"
import { firstValueFrom } from "rxjs"
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
  const settings = new ReaderSettingsManager({ spreadMode: true }, context)
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
