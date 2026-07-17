import { describe, expect, it } from "vitest"
import { Context } from "../context/Context"
import { HookManager } from "../hooks/HookManager"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { SpineItem } from "../spineItem/SpineItem"
import { Viewport } from "../viewport/Viewport"
import { SpineItemsManager } from "./SpineItemsManager"

const createManager = () => {
  const context = new Context()
  const settings = new ReaderSettingsManager({}, context)
  const hookManager = new HookManager()
  const viewport = new Viewport(context, settings)
  const spineItemsManager = new SpineItemsManager(context, settings)

  const createSpineItem = (index: number) =>
    new SpineItem(
      // biome-ignore lint/suspicious/noExplicitAny: test does not need a real manifest item
      {} as any,
      document.createElement("div"),
      context,
      settings,
      hookManager,
      index,
      viewport,
    )

  return { spineItemsManager, createSpineItem }
}

describe("getSpineItemIndex", () => {
  it("should return the stored index for each item in order", () => {
    const { spineItemsManager, createSpineItem } = createManager()
    const items = [0, 1, 2].map(createSpineItem)

    spineItemsManager.addMany(items)

    expect(spineItemsManager.getSpineItemIndex(items[0])).toBe(0)
    expect(spineItemsManager.getSpineItemIndex(items[1])).toBe(1)
    expect(spineItemsManager.getSpineItemIndex(items[2])).toBe(2)
  })

  it("should resolve by numeric index and by id", () => {
    const { spineItemsManager, createSpineItem } = createManager()
    const items = [0, 1, 2].map(createSpineItem)

    spineItemsManager.addMany(items)

    expect(spineItemsManager.getSpineItemIndex(1)).toBe(1)
    expect(spineItemsManager.getSpineItemIndex(undefined)).toBeUndefined()
  })

  it("should keep index aligned with position after a reload", () => {
    const { spineItemsManager, createSpineItem } = createManager()

    spineItemsManager.addMany([0, 1, 2].map(createSpineItem))

    spineItemsManager.destroyItems()

    const reloaded = [0, 1].map(createSpineItem)
    spineItemsManager.addMany(reloaded)

    expect(spineItemsManager.items).toHaveLength(2)
    expect(spineItemsManager.getSpineItemIndex(reloaded[0])).toBe(0)
    expect(spineItemsManager.getSpineItemIndex(reloaded[1])).toBe(1)
    expect(spineItemsManager.items[0]).toBe(reloaded[0])
    expect(spineItemsManager.items[1]).toBe(reloaded[1])
  })
})
