import {
  concatMap,
  debounceTime,
  map,
  merge,
  type Observable,
  of,
  Subject,
  share,
  switchMap,
  takeUntil,
  tap,
} from "rxjs"
import type { Context } from "../context/Context"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import type { SpineItem } from "../spineItem/SpineItem"
import { DestroyableClass } from "../utils/DestroyableClass"
import type { Viewport } from "../viewport/Viewport"
import { layoutItem } from "./layout/layoutItem"
import type { SpineItemsManager } from "./SpineItemsManager"
import type { SpineItemsObserver } from "./SpineItemsObserver"
import { SpineItemSpineLayout } from "./types"

export type PageLayoutInformation = {
  absolutePageIndex: number
  itemIndex: number
  absolutePosition: SpineItemSpineLayout
}

export type LayoutInfo = {
  pages: PageLayoutInformation[]
}

export class SpineLayout extends DestroyableClass {
  protected externalLayoutTrigger = new Subject()

  /**
   * @todo use absolute position for all direction.
   * translation of position should be done elsewhere
   */
  protected spineItemsRelativeLayouts: SpineItemSpineLayout[] = []

  /**
   * Emit layout info after each layout is done.
   */
  public readonly layout$: Observable<unknown>

  constructor(
    protected spineItemsManager: SpineItemsManager,
    protected spineItemsObserver: SpineItemsObserver,
    protected context: Context,
    protected settings: ReaderSettingsManager,
    protected viewport: Viewport,
  ) {
    super()

    // upstream change, meaning we need to layout again to both resize correctly each item but also to
    // adjust positions, etc
    // This is dispatched AFTER the spine item state has been updated.
    const spineItemNeedsLayout$ = merge(
      spineItemsObserver.itemLoad$,
      spineItemsObserver.itemUnload$,
    )

    const layoutTrigger$ = merge(
      this.externalLayoutTrigger,
      spineItemNeedsLayout$,
    )

    this.layout$ = layoutTrigger$.pipe(
      tap(() => {
        this.spineItemsManager.items.forEach((item) => {
          item.markDirty()
        })
      }),
      debounceTime(50),
      switchMap(() =>
        this.spineItemsManager.items.reduce(
          (acc$, item, itemIndex) =>
            acc$.pipe(
              concatMap(({ horizontalOffset, verticalOffset }) =>
                layoutItem({
                  context: this.context,
                  horizontalOffset,
                  index: itemIndex,
                  item,
                  settings: this.settings,
                  spineItemsManager: this.spineItemsManager,
                  verticalOffset,
                  viewport,
                }).pipe(
                  map(
                    ({
                      horizontalOffset: newHorizontalOffset,
                      verticalOffset: newVerticalOffset,
                      layoutPosition,
                    }) => {
                      this.spineItemsRelativeLayouts[itemIndex] = layoutPosition

                      return {
                        horizontalOffset: newHorizontalOffset,
                        verticalOffset: newVerticalOffset,
                      }
                    },
                  ),
                ),
              ),
            ),
          of({ horizontalOffset: 0, verticalOffset: 0 }),
        ),
      ),
      takeUntil(this.destroy$),
      share(),
    )

    this.layout$.subscribe()

    this.watchForVerticalWritingUpdate()
  }

  private watchForVerticalWritingUpdate() {
    this.spineItemsObserver.itemLoad$
      .pipe(
        tap((spineItem) => {
          this.context.update({
            hasVerticalWriting: spineItem.isUsingVerticalWriting(),
          })
        }),
        takeUntil(this.destroy$),
      )
      .subscribe()
  }

  layout() {
    this.externalLayoutTrigger.next(undefined)
  }

  public getSpineItemSpineLayoutInfo(
    spineItemOrIndex: SpineItem | number | string | undefined,
  ) {
    const itemIndex =
      this.spineItemsManager.getSpineItemIndex(spineItemOrIndex) ?? 0

    return (
      this.spineItemsRelativeLayouts[itemIndex] ||
      new SpineItemSpineLayout({
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
      })
    )
  }

  get numberOfPages() {
    return this.spineItemsManager.items.reduce((acc, item) => {
      return acc + item.numberOfPages
    }, 0)
  }

  public destroy() {
    super.destroy()

    this.externalLayoutTrigger.complete()
  }
}
