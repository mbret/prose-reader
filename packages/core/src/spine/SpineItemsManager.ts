import type { Context } from "../context/Context"
import type { HookManager } from "../hooks/HookManager"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { SpineItem, type SpineItemReference } from "../spineItem/SpineItem"
import { DestroyableClass } from "../utils/DestroyableClass"
import type { Viewport } from "../viewport/Viewport"

export class SpineItemsManager extends DestroyableClass {
  /**
   * A reader is tied to a single book so the spine item list is immutable,
   * derived from the manifest at construction. Items are attached to the DOM
   * later, once the spine element exists (see SpineItem.attach).
   */
  public readonly items: readonly SpineItem[]

  constructor(
    protected context: Context,
    protected settings: ReaderSettingsManager,
    protected hookManager: HookManager,
    protected viewport: Viewport,
  ) {
    super()

    this.items = context.manifest.spineItems.map(
      (item, index) =>
        new SpineItem(item, context, settings, hookManager, index, viewport),
    )
  }

  get(indexOrId: SpineItemReference | undefined) {
    if (typeof indexOrId === "number") {
      return this.items[indexOrId]
    }

    if (typeof indexOrId === "string") {
      return this.items.find(({ item }) => item.id === indexOrId)
    }

    return indexOrId
  }

  comparePositionOf(toCompare: SpineItem, withItem: SpineItem) {
    const toCompareIndex = this.getSpineItemIndex(toCompare) ?? 0
    const withIndex = this.getSpineItemIndex(withItem) ?? 0

    return toCompareIndex > withIndex
      ? `after`
      : toCompareIndex === withIndex
        ? `same`
        : `before`
  }

  getSpineItemIndex(spineItemOrId: SpineItem | string | number | undefined) {
    const spineItem =
      spineItemOrId instanceof SpineItem
        ? spineItemOrId
        : this.get(spineItemOrId)

    return spineItem?.index
  }

  public destroy() {
    this.items.forEach((item) => {
      item.destroy()
    })

    super.destroy()
  }
}
