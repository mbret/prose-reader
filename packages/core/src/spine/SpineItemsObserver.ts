import { map, merge, type Observable, share, switchMap } from "rxjs"
import type { SpineItem } from "../spineItem/SpineItem"
import { DestroyableClass } from "../utils/DestroyableClass"
import { observeResize } from "../utils/rxjs"
import type { SpineLocator } from "./locator/SpineLocator"
import type { SpineItemsManager } from "./SpineItemsManager"

export class SpineItemsObserver extends DestroyableClass {
  /**
   * Observable that emit every time `isReady` change but also on subscription
   */
  public itemIsReady$: Observable<{ item: SpineItem; isReady: boolean }>

  /**
   * Observable directly plugged to ResizeObserver for each item.
   */
  public itemResize$: Observable<{
    item: SpineItem
    entries: ResizeObserverEntry[]
  }>

  constructor(
    protected spineItemsManager: SpineItemsManager,
    protected spineLocator: SpineLocator,
  ) {
    super()

    this.itemIsReady$ = this.spineItemsManager.items$.pipe(
      switchMap((items) => {
        const itemsIsReady$ = items.map((item) =>
          item.isReady$.pipe(map((isReady) => ({ item, isReady }))),
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
