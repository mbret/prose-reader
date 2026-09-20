import type { Context } from "../context/Context"
import type { SpineItemsManager } from "../spine/SpineItemsManager"
import { ReactiveEntity } from "../utils/ReactiveEntity"
import type { PaginationInfo } from "./types"

export class Pagination extends ReactiveEntity<PaginationInfo> {
  constructor(
    protected context: Context,
    protected spineItemsManager: SpineItemsManager,
  ) {
    super({
      beginPageIndexInSpineItem: undefined,
      beginNumberOfPagesInSpineItem: 0,
      beginCfi: undefined,
      beginSpineItemIndex: undefined,
      endPageIndexInSpineItem: undefined,
      endNumberOfPagesInSpineItem: 0,
      endCfi: undefined,
      endSpineItemIndex: undefined,
      navigationId: undefined,
    })
  }

  /**
   * A result is replaced whole rather than merged field by field, so what is
   * published always describes one coherent moment.
   */
  public update(pagination: PaginationInfo) {
    this.mergeCompare(pagination)
  }
}
