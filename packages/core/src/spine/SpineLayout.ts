import {
  BehaviorSubject,
  type Observable,
  Subject,
  concatMap,
  debounceTime,
  exhaustMap,
  filter,
  finalize,
  first,
  from,
  map,
  merge,
  of,
  reduce,
  share,
  shareReplay,
  switchMap,
  takeUntil,
  tap,
} from "rxjs"
import type { Context } from "../context/Context"
import { isFullyPrePaginated } from "../manifest/isFullyPrePaginated"
import { Report } from "../report"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import type { SpineItem } from "../spineItem/SpineItem"
import { getSpineItemNumberOfPages } from "../spineItem/locator/getSpineItemNumberOfPages"
import { getSpineItemPositionFromPageIndex } from "../spineItem/locator/getSpineItemPositionFromPageIndex"
import { DestroyableClass } from "../utils/DestroyableClass"
import type { SpineItemsManager } from "./SpineItemsManager"
import { convertSpinePositionToLayoutPosition } from "./layout/convertViewportPositionToLayoutPosition"
import { layoutItem } from "./layout/layoutItem"
import type { SpineItemRelativeLayout } from "./layout/types"
import { getSpinePositionFromSpineItemPosition } from "./locator/getSpinePositionFromSpineItemPosition"

const NAMESPACE = `SpineLayout`

export type PageLayoutInformation = {
  absolutePageIndex: number
  itemIndex: number
  absolutePosition: SpineItemRelativeLayout
}

export type LayoutInfo = {
  spineItemsAbsolutePositions: SpineItemRelativeLayout[]
  pages: PageLayoutInformation[]
}

export class SpineLayout extends DestroyableClass {
  protected layoutSubject = new Subject()

  /**
   * @todo use absolute position for all direction.
   * translation of position should be done elsewhere
   */
  protected spineItemsRelativeLayouts: SpineItemRelativeLayout[] = []

  /**
   * Emit layout info after each layout is done.
   */
  public readonly layout$: Observable<LayoutInfo>

  /**
   * Emit current layout information on subscription.
   */
  public readonly info$: Observable<LayoutInfo>

  constructor(
    protected spineItemsManager: SpineItemsManager,
    protected context: Context,
    protected settings: ReaderSettingsManager,
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
                pages: SpineItemRelativeLayout[]
              }>,
              item,
              itemIndex,
            ) =>
              acc$.pipe(
                concatMap(({ horizontalOffset, verticalOffset, pages }) =>
                  layoutItem({
                    context: this.context,
                    horizontalOffset,
                    index: itemIndex,
                    isGloballyPrePaginated,
                    item,
                    settings: this.settings,
                    spineItemsManager: this.spineItemsManager,
                    verticalOffset,
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
                          pages: [...pages, layoutPosition],
                        }
                      },
                    ),
                  ),
                ),
              ),
            of({ horizontalOffset: 0, verticalOffset: 0, pages: [] }),
          ),
          concatMap((layout$) => layout$),
          finalize(() => {
            layoutInProgress.next(false)
          }),
        )
      }),
      map(() => {
        const items = spineItemsManager.items

        const spineItemsPagesAbsolutePositions = items.map((item) => {
          const itemLayout = this.getSpineItemRelativeLayoutInfo(item)

          const numberOfPages = getSpineItemNumberOfPages({
            isUsingVerticalWriting: !!item.isUsingVerticalWriting(),
            itemHeight: itemLayout.height,
            itemWidth: itemLayout.width,
            context,
            settings,
          })

          const pages = new Array(numberOfPages).fill(undefined)

          return pages.map((_, pageIndex) =>
            convertSpinePositionToLayoutPosition({
              pageSize: this.context.getPageSize(),
              position: getSpinePositionFromSpineItemPosition({
                itemLayout,
                spineItemPosition: getSpineItemPositionFromPageIndex({
                  isUsingVerticalWriting: !!item.isUsingVerticalWriting(),
                  itemLayout,
                  pageIndex,
                  context,
                }),
              }),
            }),
          )
        })

        const pages = spineItemsPagesAbsolutePositions.reduce(
          (acc, itemPages, itemIndex) => {
            const itemPagesInfo: PageLayoutInformation[] = itemPages.map(
              (absolutePosition, pageIndex) => ({
                itemIndex,
                absolutePageIndex: itemIndex + pageIndex,
                absolutePosition,
              }),
            )

            return [...acc, ...itemPagesInfo]
          },
          [] as PageLayoutInformation[],
        )

        return {
          spineItemsAbsolutePositions: [...this.spineItemsRelativeLayouts],
          pages,
        }
      }),
      share(),
    )

    this.info$ = this.layout$.pipe(
      tap((layout) => {
        Report.log(NAMESPACE, `layout:info`, layout)
      }),
      shareReplay({ refCount: true, bufferSize: 1 }),
    )

    merge(this.layout$, this.info$).pipe(takeUntil(this.destroy$)).subscribe()
  }

  layout() {
    this.layoutSubject.next(undefined)
  }

  getSpineItemRelativeLayoutInfo(
    spineItemOrIndex: SpineItem | number | string | undefined,
  ) {
    const itemIndex =
      this.spineItemsManager.getSpineItemIndex(spineItemOrIndex) ?? 0

    return (
      this.spineItemsRelativeLayouts[itemIndex] ||
      ({
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
      } satisfies SpineItemRelativeLayout)
    )
  }

  public destroy() {
    super.destroy()

    this.layoutSubject.complete()
  }
}
