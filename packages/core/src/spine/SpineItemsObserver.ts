import { isShallowEqual } from "@prose-reader/shared"
import {
  distinctUntilChanged,
  map,
  merge,
  type Observable,
  pairwise,
  share,
} from "rxjs"
import type { DocumentLoadStatus } from "../spineItem/renderer/DocumentRenderer"
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

  /**
   * Emits each time an item's `loadStatus` changes, with the status it
   * changed from:
   *
   * - `idle` to `loading`: a load starts.
   * - `loading` to `loaded` or `error`: the document loaded, or failed to.
   * - `loading` or `loaded` to `unloading`: an unload starts, cancelling a
   *   load in progress.
   * - `unloading` to `idle`: the document is released.
   * - `unloading` to `loading`: a load comes while the release waits.
   * - `error` to `idle`: an item in error is unloaded, with nothing left to
   *   release since its failure did.
   *
   * It is delivered as the item's state changes, as `itemStateChange$` is,
   * so `item.value` holds the new status and its `loadError`. A subscriber
   * that changes an item's state in response must defer that change, as the
   * spine's layout does: done during the delivery, it would reach the
   * item's later subscribers before the status it responds to.
   */
  public itemLoadStatusChange$: Observable<{
    item: SpineItem
    previousLoadStatus: DocumentLoadStatus
    loadStatus: DocumentLoadStatus
  }>

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

    this.itemLoadStatusChange$ = merge(
      ...items.map((item) =>
        item.watch("loadStatus").pipe(
          pairwise(),
          map(([previousLoadStatus, loadStatus]) => ({
            item,
            previousLoadStatus,
            loadStatus,
          })),
        ),
      ),
    ).pipe(share())
  }
}
