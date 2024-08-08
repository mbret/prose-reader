import { map, merge, Observable, share, switchMap } from "rxjs"
import { SpineItemsManager } from "./SpineItemsManager"
import { DestroyableClass } from "../utils/DestroyableClass"
import { SpineItem } from "../spineItem/createSpineItem"
import { observeResize } from "../utils/rxjs"

export class SpineItemsObserver extends DestroyableClass {
  /**
   * Observable that emit every time `isReady` change
   */
  public itemIsReady$: Observable<{ item: SpineItem; isReady: boolean }>

  /**
   * Observable directly plugged to ResizeObserver for each item.
   */
  public itemResize$: Observable<{
    item: SpineItem
    entries: ResizeObserverEntry[]
  }>

  constructor(protected spineItemsManager: SpineItemsManager) {
    super()

    this.itemIsReady$ = this.spineItemsManager.items$.pipe(
      switchMap((items) => {
        const itemsIsReady$ = items.map((item) =>
          item.$.isReady$.pipe(map((isReady) => ({ item, isReady }))),
        )

        return merge(...itemsIsReady$)
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
  }
}
