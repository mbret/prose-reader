import {
  BehaviorSubject,
  concatMap,
  debounceTime,
  exhaustMap,
  filter,
  finalize,
  first,
  from,
  map,
  merge,
  type Observable,
  of,
  reduce,
  Subject,
  share,
  switchMap,
  takeUntil,
  tap,
} from "rxjs"
import type { Context } from "../context/Context"
import { isFullyPrePaginated } from "../manifest/isFullyPrePaginated"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import type { SpineItem } from "../spineItem/SpineItem"
import { DestroyableClass } from "../utils/DestroyableClass"
import type { Viewport } from "../viewport/Viewport"
import { layoutItem } from "./layout/layoutItem"
import type { SpineItemsManager } from "./SpineItemsManager"
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
  protected layoutSubject = new Subject()

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
    protected context: Context,
    protected settings: ReaderSettingsManager,
    protected viewport: Viewport,
  ) {
    super()

    spineItemsManager.items$
      .pipe(
        tap(() => {
          this.spineItemsRelativeLayouts = []
        }),
        switchMap((items) => {
          // upstream change, meaning we need to layout again to both resize correctly each item but also to
          // adjust positions, etc
          const needsLayouts$ = items.map((spineItem) =>
            spineItem.needsLayout$.pipe(
              tap(() => {
                this.layout()
              }),
            ),
          )

          const writingModeUpdate$ = items.map((spineItem) =>
            spineItem.loaded$.pipe(
              tap(() => {
                if (spineItem.isUsingVerticalWriting()) {
                  this.context.update({
                    hasVerticalWriting: true,
                  })
                } else {
                  this.context.update({
                    hasVerticalWriting: false,
                  })
                }
              }),
            ),
          )

          return merge(...needsLayouts$, ...writingModeUpdate$)
        }),
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe()

    const layoutInProgress = new BehaviorSubject<boolean>(false)

    this.layout$ = this.layoutSubject.pipe(
      tap(() => {
        this.spineItemsManager.items.forEach((item) => {
          item.markDirty()
        })
      }),
      debounceTime(50),
      // queue layout until previous layout is done
      exhaustMap(() =>
        layoutInProgress.pipe(
          filter((value) => !value),
          first(),
        ),
      ),
      exhaustMap(() => {
        layoutInProgress.next(true)

        const manifest = this.context.manifest
        const isGloballyPrePaginated = isFullyPrePaginated(manifest) ?? false
        const items$ = from(this.spineItemsManager.items)

        return items$.pipe(
          reduce(
            (
              acc$: Observable<{
                horizontalOffset: number
                verticalOffset: number
              }>,
              item,
              itemIndex,
            ) =>
              acc$.pipe(
                concatMap(({ horizontalOffset, verticalOffset }) =>
                  layoutItem({
                    context: this.context,
                    horizontalOffset,
                    index: itemIndex,
                    isGloballyPrePaginated,
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
                        this.spineItemsRelativeLayouts[itemIndex] =
                          layoutPosition

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
          concatMap((layout$) => layout$),
          finalize(() => {
            layoutInProgress.next(false)
          }),
        )
      }),
      share(),
    )

    merge(this.layout$).pipe(takeUntil(this.destroy$)).subscribe()
  }

  layout() {
    this.layoutSubject.next(undefined)
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

    this.layoutSubject.complete()
  }
}
