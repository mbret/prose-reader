import type { Context } from "../context/Context"
import type { SpineItemsManager } from "../spine/SpineItemsManager"
import { ReactiveEntity } from "../utils/ReactiveEntity"

export type PaginationInfo = {
  beginPageIndexInSpineItem: number | undefined
  beginNumberOfPagesInSpineItem: number
  beginCfi: string | undefined
  beginSpineItemIndex: number | undefined
  endPageIndexInSpineItem: number | undefined
  endNumberOfPagesInSpineItem: number
  endCfi: string | undefined
  endSpineItemIndex: number | undefined
  navigationId?: symbol
}

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

  public update(pagination: Partial<PaginationInfo>) {
    this.mergeCompare(pagination)
  }
}
