import { Context } from "../context/Context"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { extractProseMetadataFromCfi } from "../cfi/lookup/extractProseMetadataFromCfi"
import { DestroyableClass } from "../utils/DestroyableClass"
import { BehaviorSubject } from "rxjs"
import { SpineItem } from "../spineItem/SpineItem"

export class SpineItemsManager extends DestroyableClass {
  constructor(
    protected context: Context,
    protected settings: ReaderSettingsManager,
  ) {
    super()
  }

  protected orderedSpineItemsSubject = new BehaviorSubject<SpineItem[]>([])
  public items$ = this.orderedSpineItemsSubject.asObservable()

  get(indexOrId: number | string | SpineItem | undefined) {
    if (typeof indexOrId === `number`) {
      return this.orderedSpineItemsSubject.value[indexOrId]
    }

    if (typeof indexOrId === `string`) {
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

  getSpineItemIndex(spineItem: SpineItem | undefined) {
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
    const { itemId } = extractProseMetadataFromCfi(cfi)

    if (itemId) {
      const { itemId } = extractProseMetadataFromCfi(cfi)
      const spineItem = (itemId ? this.get(itemId) : undefined) || this.get(0)

      return spineItem
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
