import type { Context } from "../context/Context"
import type { SpineItemsManager } from "../spine/SpineItemsManager"
import { ReactiveEntity } from "../utils/ReactiveEntity"
import { createEmptyPaginationEdge, isSamePaginationResult } from "./edges"
import type { PaginationInfo } from "./types"

export class Pagination extends ReactiveEntity<PaginationInfo> {
  constructor(
    protected context: Context,
    protected spineItemsManager: SpineItemsManager,
  ) {
    super({
      isSettled: false,
      begin: createEmptyPaginationEdge(),
      end: createEmptyPaginationEdge(),
      navigationId: undefined,
    })
  }

  /**
   * A result is replaced whole rather than merged field by field, so what is
   * published always describes one coherent moment.
   *
   * The edges are compared by value. A result is rebuilt from scratch each
   * time, so the shallow comparison the entity does by default would see two
   * new edge objects and publish a result identical to the current one.
   */
  public update(pagination: PaginationInfo) {
    if (isSamePaginationResult(this.value, pagination)) return

    this.mergeCompare(pagination)
  }
}
