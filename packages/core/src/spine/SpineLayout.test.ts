import type { Manifest } from "@prose-reader/shared"
import { firstValueFrom } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import { Context } from "../context/Context"
import { HookManager } from "../hooks/HookManager"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { SpineItem } from "../spineItem/SpineItem"
import { Viewport } from "../viewport/Viewport"
import { SpineItemsManager } from "./SpineItemsManager"
import { SpineItemsObserver } from "./SpineItemsObserver"
import { SpineLayout } from "./SpineLayout"

const createSpineItem = ({
  context,
  hookManager,
  index,
  parentElement,
  settings,
  viewport,
}: {
  context: Context
  hookManager: HookManager
  index: number
  parentElement: HTMLElement
  settings: ReaderSettingsManager
  viewport: Viewport
}) => {
  const item: Manifest["spineItems"][number] = {
    href: `item-${index}.xhtml`,
    id: `item-${index}`,
    index,
    mediaType: `application/xhtml+xml`,
  }

  return new SpineItem(
    item,
    parentElement,
    context,
    settings,
    hookManager,
    index,
    viewport,
  )
}

const createTestSpineLayout = () => {
  const context = new Context()
  const settings = new ReaderSettingsManager({}, context)
  const hookManager = new HookManager()
  const viewport = new Viewport(context, settings)
  const spineItemsManager = new SpineItemsManager(context, settings)
  const spineItemsObserver = new SpineItemsObserver(spineItemsManager)
  const spineLayout = new SpineLayout(
    spineItemsManager,
    spineItemsObserver,
    context,
    settings,
    viewport,
  )
  const parentElement = document.createElement(`div`)

  vi.spyOn(viewport.value.element, "clientWidth", "get").mockReturnValue(100)
  vi.spyOn(viewport.value.element, "clientHeight", "get").mockReturnValue(100)
  viewport.layout()

  spineItemsManager.addMany([
    createSpineItem({
      context,
      hookManager,
      index: 0,
      parentElement,
      settings,
      viewport,
    }),
  ])

  const destroy = () => {
    spineLayout.destroy()
    spineItemsObserver.destroy()
    spineItemsManager.destroyItems()
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
})
