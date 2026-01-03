import { isShallowEqual } from "@prose-reader/shared"
import {
  distinctUntilChanged,
  map,
  merge,
  type Observable,
  share,
  switchMap,
} from "rxjs"
import type { SpineItem, SpineItemState } from "../spineItem/SpineItem"
import { DestroyableClass } from "../utils/DestroyableClass"
import { observeResize } from "../utils/rxjs"
import type { SpineItemsManager } from "./SpineItemsManager"

export class SpineItemsObserver extends DestroyableClass {
  /**
   * Shared observable which emits every time a spine item state change.
   * As there can be lot of spine items and subscriptions can become costly it is
   * encouraged to use this shared observable.
   */
  public states$: Observable<{ item: SpineItem } & SpineItemState>

  /**
   * Observable directly plugged to ResizeObserver for each item.
   */
  public itemResize$: Observable<{
    item: SpineItem
    entries: ResizeObserverEntry[]
  }>

  public itemLoad$: Observable<SpineItem>
  public itemUnload$: Observable<SpineItem>

  constructor(protected spineItemsManager: SpineItemsManager) {
    super()

    this.states$ = this.spineItemsManager.items$.pipe(
      switchMap((items) => {
        return merge(
          ...items.map((item) =>
            item.pipe(
              map((state) => ({ item, ...state })),
              distinctUntilChanged(isShallowEqual),
            ),
          ),
        )
      }),
      share(),
    )

    this.itemResize$ = this.spineItemsManager.items$.pipe(
      switchMap((items) => {
        const resize$ = items.map((item) =>
          observeResize(item.element).pipe(
            map((entries) => ({ entries, item })),
          ),
        )

        return merge(...resize$)
      }),
      share(),
    )

    this.itemLoad$ = this.spineItemsManager.items$.pipe(
      switchMap((items) => {
        return merge(...items.map((item) => item.loaded$.pipe(map(() => item))))
      }),
      share(),
    )

    this.itemUnload$ = this.spineItemsManager.items$.pipe(
      switchMap((items) => {
        return merge(
          ...items.map((item) => item.unloaded$.pipe(map(() => item))),
        )
      }),
      share(),
    )
  }
}
