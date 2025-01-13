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
  share,
  shareReplay,
  Subject,
  switchMap,
  takeUntil,
  tap,
} from "rxjs"
import type { Context } from "../context/Context"
import { Report } from "../report"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { DestroyableClass } from "../utils/DestroyableClass"
import type { SpineItemsManager } from "./SpineItemsManager"
import { isShallowEqual } from "../utils/objects"
import { getSpineItemNumberOfPages } from "../spineItem/locator/getSpineItemNumberOfPages"
import { getSpinePositionFromSpineItemPosition } from "./locator/getSpinePositionFromSpineItemPosition"
import { getSpineItemPositionFromPageIndex } from "../spineItem/locator/getSpineItemPositionFromPageIndex"
import { convertSpinePositionToLayoutPosition } from "./layout/convertViewportPositionToLayoutPosition"
import type { SpineItem } from "../spineItem/SpineItem"
import { layoutItem } from "./layout/layoutItem"
import { isFullyPrePaginated } from "../manifest/isFullyPrePaginated"

const NAMESPACE = `SpineLayout`

export type LayoutPosition = {
  left: number
  right: number
  top: number
  bottom: number
  width: number
  height: number
  x: number
  y: number
  __symbol?: `LayoutPosition`
}

export type PageLayoutInformation = {
  absolutePageIndex: number
  itemIndex: number
  absolutePosition: LayoutPosition
}

export type LayoutInfo = {
  hasChanged: boolean
  spineItemsAbsolutePositions: LayoutPosition[]
  spineItemsPagesAbsolutePositions: LayoutPosition[][]
  pages: PageLayoutInformation[]
}

export class SpineLayout extends DestroyableClass {
  /**
   * This contains every item dimension / position on the viewport.
   * This is only used to avoid intensively request bounding of each items later.
   * This is always in sync with every layout since it is being updated for every layout
   * done with the manager.
   */
  protected itemLayoutInformation: LayoutPosition[] = []

  protected layoutSubject = new Subject()

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
        const newItemLayoutInformation: typeof this.itemLayoutInformation = []
        const isGloballyPrePaginated = isFullyPrePaginated(manifest) ?? false

        return from(this.spineItemsManager.items).pipe(
          reduce(
            (acc$, item, index) =>
              acc$.pipe(
                concatMap(({ horizontalOffset, verticalOffset }) =>
                  layoutItem({
                    context: this.context,
                    horizontalOffset,
                    index,
                    isGloballyPrePaginated,
                    item,
                    settings: this.settings,
                    spineItemsManager: this.spineItemsManager,
                    verticalOffset,
                    newItemLayoutInformation,
                  }),
                ),
              ),
            of({ horizontalOffset: 0, verticalOffset: 0 }),
          ),
          concatMap((layout$) => layout$),
          map(() => {
            const hasChanged =
              this.itemLayoutInformation.length !==
                newItemLayoutInformation.length ||
              this.itemLayoutInformation.some(
                (old, index) =>
                  !isShallowEqual(old, newItemLayoutInformation[index]),
              )

            this.itemLayoutInformation = newItemLayoutInformation

            Report.log(NAMESPACE, `layout`, {
              hasChanged,
              itemLayoutInformation: this.itemLayoutInformation,
            })

            return { hasChanged }
          }),
          finalize(() => {
            layoutInProgress.next(false)
          }),
        )
      }),
      map(({ hasChanged }) => {
        const items = spineItemsManager.items

        const spineItemsPagesAbsolutePositions = items.map((item) => {
          const itemLayout = this.getAbsolutePositionOf(item)

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
          hasChanged,
          spineItemsAbsolutePositions: items.map((item) =>
            this.getAbsolutePositionOf(item),
          ),
          spineItemsPagesAbsolutePositions,
          pages,
        }
      }),
      share(),
    )

    this.info$ = this.layout$.pipe(
      shareReplay({ refCount: true, bufferSize: 1 }),
    )

    merge(this.layout$, this.info$).pipe(takeUntil(this.destroy$)).subscribe()
  }

  layout() {
    this.layoutSubject.next(undefined)
  }

  /**
   * It's important to not use x,y since we need the absolute position of each element. Otherwise x,y would be relative to
   * current window (viewport).
   */
  getAbsolutePositionOf(
    spineItemOrIndex: SpineItem | number | string | undefined,
  ) {
    const fallback = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
    }

    const spineItem = this.spineItemsManager.get(spineItemOrIndex)

    const indexOfItem = spineItem
      ? this.spineItemsManager.items.indexOf(spineItem)
      : -1

    const layoutInformation = this.itemLayoutInformation[indexOfItem]

    return layoutInformation || fallback
  }

  public destroy() {
    super.destroy()

    this.layoutSubject.complete()
  }
}
