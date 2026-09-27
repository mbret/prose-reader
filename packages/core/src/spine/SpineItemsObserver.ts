import { isShallowEqual } from "@prose-reader/shared"
import {
  asapScheduler,
  distinctUntilChanged,
  map,
  merge,
  type Observable,
  observeOn,
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
   * changed from: a load starting, a document loaded, a load failing, an
   * unload starting, and the document released.
   *
   * It is delivered once the change has reached every subscriber of the
   * item's state, so a subscriber that changes an item's state in response,
   * as a layout does, never has it delivered out of order. By then the item
   * may have moved on: read the change, not `item.value`.
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
    ).pipe(observeOn(asapScheduler), share())
  }
}
