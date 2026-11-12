import {
  getItemSpreadPosition,
  isShallowEqual,
  type Manifest,
  type SpreadPosition,
} from "@prose-reader/shared"
import { catchError, defer, map, type Observable, of, Subject, tap } from "rxjs"
import type { Context } from "../context/Context"
import type { HookManager } from "../hooks/HookManager"
import { reportRecoveredError } from "../report"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { DestroyableClass } from "../utils/DestroyableClass"
import {
  removeStylePropertyIfPresent,
  setStylePropertyIfChanged,
} from "../utils/dom"
import type { Viewport } from "../viewport/Viewport"
import type { DocumentRenderer } from "./renderer/DocumentRenderer"

type SpineItemLayoutParams = {
  spreadPosition: SpreadPosition
  horizontalOffset: number
  isLastItem: boolean
  edgeX: number
  edgeY: number
}

export class SpineItemLayout extends DestroyableClass {
  private readonly didLayoutSubject = new Subject<{
    width: number
    height: number
  }>()

  /**
   * The size that the last layout gave the item's container, with the page
   * size it was laid out for. It is the item's size: only that layout writes
   * the container's width and height.
   */
  private lastLayout: {
    width: number
    height: number
    pageSize: { width: number; height: number }
  } | null = null

  public readonly didLayout$ = this.didLayoutSubject.asObservable()

  constructor(
    public item: Manifest[`spineItems`][number],
    public containerElement: HTMLElement,
    public context: Context,
    public hookManager: HookManager,
    public renderer: DocumentRenderer,
    public settings: ReaderSettingsManager,
    public viewport: Viewport,
  ) {
    super()
  }

  private validateDimension(
    value: number,
    pageSize: number,
    minimum: number,
  ): number {
    if (value <= 0) return minimum

    const maxValue = Math.max(value, minimum)

    // Check if value is a multiple of page size
    const multiplier = Math.ceil(maxValue / pageSize)
    const adjustedValue = multiplier * pageSize

    // Ensure the value meets minimum requirement
    return Math.max(adjustedValue, pageSize)
  }

  private computeLayoutInformation = ({
    isLastItem,
    horizontalOffset,
    spreadPosition,
  }: {
    isLastItem: boolean
    horizontalOffset: number
    spreadPosition: SpreadPosition
  }) => {
    let minimumWidth = this.viewport.value.pageSize.width
    let blankPagePosition: `none` | `before` | `after` = `none`
    const isScreenStartItem =
      horizontalOffset % this.viewport.absoluteViewport.width === 0
    if (this.viewport.value.isSpread) {
      const isGloballyPrePaginated = this.context.value.isFullyPrePaginated

      /**
       * for now every reflowable content that has reflow siblings takes the entire screen by default
       * this simplify many things and I am not sure the specs allow one reflow
       * to end and an other one to start on the same screen anyway
       *
       * @important
       * For now this is impossible to have reflow not taking all screen. This is because
       * when an element is unloaded, the next element will move back its x axis, then an adjustment
       * will occurs and the previous element will become visible again, meaning it will be loaded,
       * therefore pushing the focused element, meaning adjustment again, then unload of previous one,
       * ... infinite loop. Due to the nature of reflow it's pretty much impossible to not load the entire
       * book with spread on to make it work.
       *
       * @important
       * When the book is globally pre-paginated we will not apply any of this even if each item is
       * reflowable. This is mostly a publisher mistake but does not comply with spec. Therefore
       * we ignore it
       */
      if (
        !isGloballyPrePaginated &&
        this.renderer.renditionLayout === `reflowable` &&
        !isLastItem
      ) {
        minimumWidth = this.viewport.value.pageSize.width * 2
      }

      // mainly to make loading screen looks good
      if (
        !isGloballyPrePaginated &&
        this.renderer.renditionLayout === `reflowable` &&
        isLastItem &&
        isScreenStartItem
      ) {
        minimumWidth = this.viewport.value.pageSize.width * 2
      }

      const lastItemStartOnNewScreenInAPrepaginatedBook =
        isScreenStartItem && isLastItem && isGloballyPrePaginated
      const requestedSpreadPosition = getItemSpreadPosition(this.item)

      if (
        requestedSpreadPosition !== undefined &&
        requestedSpreadPosition !== spreadPosition
      ) {
        blankPagePosition = `before`
        minimumWidth = this.viewport.value.pageSize.width * 2
      } else if (lastItemStartOnNewScreenInAPrepaginatedBook) {
        if (this.context.isRTL()) {
          blankPagePosition = `before`
        } else {
          blankPagePosition = `after`
        }

        minimumWidth = this.viewport.value.pageSize.width * 2
      }
    }

    return {
      minimumWidth,
      blankPagePosition,
    }
  }

  private adjustPositionOfElement = ({
    right,
    left,
    top,
  }: {
    right?: number
    left?: number
    top?: number
  }) => {
    if (right !== undefined) {
      setStylePropertyIfChanged(
        this.containerElement.style,
        `right`,
        `${right}px`,
      )
    } else {
      removeStylePropertyIfPresent(this.containerElement.style, `right`)
    }
    if (left !== undefined) {
      setStylePropertyIfChanged(
        this.containerElement.style,
        `left`,
        `${left}px`,
      )
    } else {
      removeStylePropertyIfPresent(this.containerElement.style, `left`)
    }
    if (top !== undefined) {
      setStylePropertyIfChanged(this.containerElement.style, `top`, `${top}px`)
    } else {
      removeStylePropertyIfPresent(this.containerElement.style, `top`)
    }
  }

  private updateContainerLayout =
    ({
      minimumWidth,
      edgeX,
      edgeY,
    }: {
      minimumWidth: number
      edgeX: number
      edgeY: number
    }) =>
    (stream: Observable<{ width: number; height: number } | undefined>) =>
      stream.pipe(
        map((dims) => {
          const trustableLastLayout = isShallowEqual(
            this.lastLayout?.pageSize,
            this.viewport.pageSize,
          )
            ? this.lastLayout
            : undefined

          const { width: previousWidth, height: previousHeight } =
            trustableLastLayout ?? {}
          const { width = previousWidth, height = previousHeight } = dims ?? {}
          const { width: pageSizeWidth, height: pageSizeHeight } =
            this.viewport.pageSize

          const safeWidth = this.validateDimension(
            width ?? pageSizeWidth,
            pageSizeWidth,
            minimumWidth,
          )
          const safeHeight =
            this.settings.values.computedPageTurnMode === "scrollable"
              ? (height ?? pageSizeHeight)
              : this.validateDimension(
                  height ?? pageSizeHeight,
                  pageSizeHeight,
                  pageSizeHeight,
                )

          this.lastLayout = {
            width: safeWidth,
            height: safeHeight,
            pageSize: this.viewport.pageSize,
          }

          setStylePropertyIfChanged(
            this.containerElement.style,
            `width`,
            `${safeWidth}px`,
          )
          setStylePropertyIfChanged(
            this.containerElement.style,
            `height`,
            `${safeHeight}px`,
          )

          if (this.settings.values.computedPageTurnDirection === `vertical`) {
            this.adjustPositionOfElement({
              top: edgeY,
              left: edgeX,
            })

            return { width: safeWidth, height: safeHeight }
          }

          // We can now adjust the position of the item if needed based on its new layout.
          // For simplification we use an edge offset, which means for LTR it will be x from left and for RTL
          // it will be x from right
          this.adjustPositionOfElement(
            this.context.isRTL()
              ? { right: edgeX, top: 0 }
              : { left: edgeX, top: 0 },
          )

          return { width: safeWidth, height: safeHeight }
        }),
      )

  /**
   * Lays the item out once per subscription. Without a subscriber, nothing
   * happens. If the pass is cancelled, the layout stops and the item stays
   * dirty. A hook of the layout that throws is reported, and the layout goes
   * on without it.
   */
  public layout = ({
    spreadPosition,
    horizontalOffset,
    isLastItem,
    edgeX,
    edgeY,
  }: SpineItemLayoutParams) =>
    defer(() => {
      const { blankPagePosition, minimumWidth } = this.computeLayoutInformation(
        {
          horizontalOffset,
          isLastItem,
          spreadPosition,
        },
      )
      const hookParams = { blankPagePosition, item: this.item, minimumWidth }

      this.hookManager.executeIsolated(`item.onBeforeLayout`, hookParams)

      return this.renderer
        .layout({
          blankPagePosition,
          minPageSpread: minimumWidth / this.viewport.pageSize.width,
          minimumWidth,
          spreadPosition,
        })
        .pipe(
          this.updateContainerLayout({ minimumWidth, edgeX, edgeY }),
          tap(() => {
            this.hookManager.executeIsolated(`item.onAfterLayout`, hookParams)
          }),
        )
    }).pipe(
      /**
       * A layout that fails outside the renderer, such as in a getter that a
       * renderer overrides, sizes the item as a renderer that gives no size
       * does, from one page: the pass still gives every item a place.
       */
      catchError((error) => {
        reportRecoveredError(error)

        return of(undefined).pipe(
          this.updateContainerLayout({
            minimumWidth: this.viewport.pageSize.width,
            edgeX,
            edgeY,
          }),
        )
      }),
      // A step of its own, which a hook that cancels the pass skips, so the
      // item stays dirty.
      tap((size) => {
        this.didLayoutSubject.next(size)
      }),
    )

  public destroy() {
    this.didLayoutSubject.complete()

    super.destroy()
  }

  /** The size of the item, or 0 by 0 before its first layout. */
  get layoutInfo() {
    return {
      width: this.lastLayout?.width ?? 0,
      height: this.lastLayout?.height ?? 0,
    }
  }
}
