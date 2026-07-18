import { isShallowEqual } from "@prose-reader/shared"
import { distinctUntilChanged, map, merge, type Observable, share } from "rxjs"
import type { SpineItem, SpineItemState } from "../spineItem/SpineItem"
import { DestroyableClass } from "../utils/DestroyableClass"
import { observeResize } from "../utils/rxjs"
import type { SpineItemsManager } from "./SpineItemsManager"

export class SpineItemsObserver extends DestroyableClass {
  /**
   * Shared observable which emits every time a spine item state changes.
   * As there can be lot of spine items and subscriptions can become costly it is
   * encouraged to use this shared observable. Read `item.value` for a current
   * snapshot rather than relying on this stream to replay on subscribe.
   */
  public itemStateChange$: Observable<{ item: SpineItem } & SpineItemState>

  /**
   * Observable directly plugged to ResizeObserver for each item.
   *
   * Items are only attached to the DOM at mount, and ResizeObserver does not
   * report detached elements, so this starts emitting once items are attached.
   */
  public itemResize$: Observable<{
    item: SpineItem
    entries: ResizeObserverEntry[]
  }>

  public itemLoad$: Observable<SpineItem>
  public itemUnload$: Observable<SpineItem>

  constructor(protected spineItemsManager: SpineItemsManager) {
    super()

    const items = spineItemsManager.items

    this.itemStateChange$ = merge(
      ...items.map((item) =>
        item.pipe(
          map((state) => ({ item, ...state })),
          distinctUntilChanged(isShallowEqual),
        ),
      ),
    ).pipe(share())

    this.itemResize$ = merge(
      ...items.map((item) =>
        observeResize(item.element).pipe(map((entries) => ({ entries, item }))),
      ),
    ).pipe(share())

    this.itemLoad$ = merge(
      ...items.map((item) => item.loaded$.pipe(map(() => item))),
    ).pipe(share())

    this.itemUnload$ = merge(
      ...items.map((item) => item.unloaded$.pipe(map(() => item))),
    ).pipe(share())
  }
}
