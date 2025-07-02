import { BehaviorSubject } from "rxjs"
import { parseCfi } from "../cfi"
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

    if (!spineItem) return undefined

    const index = this.orderedSpineItemsSubject.value.indexOf(spineItem)

    return index < 0 ? undefined : index
  }

  addMany(spineItems: SpineItem[]) {
    this.orderedSpineItemsSubject.next([
      ...this.orderedSpineItemsSubject.getValue(),
      ...spineItems,
    ])
  }

  // @todo move
  getSpineItemFromCfi(cfi: string) {
    const { itemIndex } = parseCfi(cfi)

    if (itemIndex !== undefined) {
      return this.get(itemIndex)
    }

    return undefined
  }

  get items() {
    return this.orderedSpineItemsSubject.value
  }

  /**
   * @todo handle reload, remove subscription to each items etc. See add()
   */
  destroyItems() {
    this.orderedSpineItemsSubject.value.forEach((item) => item.destroy())
  }
}
