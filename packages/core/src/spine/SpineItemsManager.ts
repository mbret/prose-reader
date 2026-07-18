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

  get(indexOrId: SpineItemReference | undefined) {
    if (typeof indexOrId === "number") {
      return this.orderedSpineItemsSubject.value[indexOrId]
    }

    if (typeof indexOrId === "string") {
      return this.orderedSpineItemsSubject.value.find(
        ({ item }) => item.id === indexOrId,
      )
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
   * @todo remove subscription to each items etc. See add()
   */
  destroyItems() {
    const items = this.orderedSpineItemsSubject.value

    items.forEach((item) => {
      item.destroy()
    })

    if (items.length) {
      this.orderedSpineItemsSubject.next([])
    }
  }

  public destroy() {
    this.destroyItems()

    super.destroy()
  }
}
