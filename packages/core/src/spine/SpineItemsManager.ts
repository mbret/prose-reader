import { BehaviorSubject } from "rxjs"
import type { Context } from "../context/Context"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { SpineItem, type SpineItemReference } from "../spineItem/SpineItem"
import { DestroyableClass } from "../utils/DestroyableClass"

export class SpineItemsManager extends DestroyableClass {
  constructor(
    protected context: Context,
    protected settings: ReaderSettingsManager,
  ) {
    super()
  }

  protected orderedSpineItemsSubject = new BehaviorSubject<SpineItem[]>([])
  public items$ = this.orderedSpineItemsSubject.asObservable()

  /**
   * Lookup caches for O(1) resolution of an item by id and of an item's index.
   *
   * `get(id)` and `getSpineItemIndex` are called on hot paths (every layout,
   * navigation resolve and pagination update, often once per item inside a loop
   * over the whole spine), which made the previous `find`/`indexOf` scans O(n²)
   * over the spine. The maps are rebuilt lazily only when the items array
   * reference changes (i.e. on `addMany`), so all subsequent lookups are O(1).
   */
  private lookupCacheSource: SpineItem[] | undefined
  private itemById = new Map<string, SpineItem>()
  private indexByItem = new Map<SpineItem, number>()

  private ensureLookups() {
    const items = this.orderedSpineItemsSubject.value

    if (this.lookupCacheSource === items) return

    this.lookupCacheSource = items
    this.itemById = new Map()
    this.indexByItem = new Map()

    items.forEach((spineItem, index) => {
      // Preserve first-occurrence semantics of the previous `find`/`indexOf`.
      if (!this.indexByItem.has(spineItem)) {
        this.indexByItem.set(spineItem, index)
      }
      if (!this.itemById.has(spineItem.item.id)) {
        this.itemById.set(spineItem.item.id, spineItem)
      }
    })
  }

  get(indexOrId: SpineItemReference | undefined) {
    if (typeof indexOrId === "number") {
      return this.orderedSpineItemsSubject.value[indexOrId]
    }

    if (typeof indexOrId === "string") {
      this.ensureLookups()

      return this.itemById.get(indexOrId)
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

    if (!spineItem) return undefined

    this.ensureLookups()

    return this.indexByItem.get(spineItem)
  }

  addMany(spineItems: SpineItem[]) {
    this.orderedSpineItemsSubject.next([
      ...this.orderedSpineItemsSubject.getValue(),
      ...spineItems,
    ])
  }

  get items() {
    return this.orderedSpineItemsSubject.value
  }

  /**
   * @todo handle reload, remove subscription to each items etc. See add()
   */
  destroyItems() {
    this.orderedSpineItemsSubject.value.forEach((item) => {
      item.destroy()
    })
  }
}
