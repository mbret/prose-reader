import { describe, expect, it } from "vitest"
import { Context } from "../context/Context"
import { HookManager } from "../hooks/HookManager"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import {
  createTestManifest,
  createTestManifestSpineItems,
} from "../tests/utils"
import { Viewport } from "../viewport/Viewport"
import { SpineItemsManager } from "./SpineItemsManager"

const createManager = (numberOfItems: number) => {
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

  return { spineItemsManager, hookManager }
}

describe("items", () => {
  it("should build one detached item per manifest spine item at construction", () => {
    const { spineItemsManager } = createManager(3)

    expect(spineItemsManager.items).toHaveLength(3)
    expect(spineItemsManager.items.map(({ item }) => item.id)).toEqual([
      "item-0",
      "item-1",
      "item-2",
    ])
    expect(
      spineItemsManager.items.every(
        (item) => item.element.parentElement === null,
      ),
    ).toBe(true)
  })
})

describe("get", () => {
  it("should resolve by numeric index and by id", () => {
    const { spineItemsManager } = createManager(3)

    expect(spineItemsManager.get(1)).toBe(spineItemsManager.items[1])
    expect(spineItemsManager.get("item-2")).toBe(spineItemsManager.items[2])
    expect(spineItemsManager.get(undefined)).toBeUndefined()
  })
})

describe("getSpineItemIndex", () => {
  it("should return the stored index for each item in order", () => {
    const { spineItemsManager } = createManager(3)
    const items = spineItemsManager.items

    expect(spineItemsManager.getSpineItemIndex(items[0])).toBe(0)
    expect(spineItemsManager.getSpineItemIndex(items[1])).toBe(1)
    expect(spineItemsManager.getSpineItemIndex(items[2])).toBe(2)
  })

  it("should resolve by numeric index and by id", () => {
    const { spineItemsManager } = createManager(3)

    expect(spineItemsManager.getSpineItemIndex(1)).toBe(1)
    expect(spineItemsManager.getSpineItemIndex("item-2")).toBe(2)
    expect(spineItemsManager.getSpineItemIndex(undefined)).toBeUndefined()
  })
})

describe("attach", () => {
  it("should run hooks registered after construction, before appending", () => {
    const { spineItemsManager, hookManager } = createManager(1)
    const parent = document.createElement("div")
    const hookCalls: Array<{ id: string; parentAtHookTime: unknown }> = []

    hookManager.register(
      "item.onBeforeContainerAttach",
      ({ element, item }) => {
        hookCalls.push({ id: item.id, parentAtHookTime: element.parentElement })
      },
    )

    spineItemsManager.items.forEach((item) => {
      item.attach(parent)
    })

    expect(hookCalls).toEqual([{ id: "item-0", parentAtHookTime: null }])
    expect(spineItemsManager.items[0]?.element.parentElement).toBe(parent)
  })
})

describe("destroy", () => {
  it("should destroy its items", () => {
    const { spineItemsManager } = createManager(3)
    const parent = document.createElement("div")
    const items = spineItemsManager.items

    items.forEach((item) => {
      item.attach(parent)
    })

    expect(items.every((item) => item.element.parentElement === parent)).toBe(
      true,
    )

    spineItemsManager.destroy()

    expect(items.every((item) => item.element.parentElement === null)).toBe(
      true,
    )
  })
})
