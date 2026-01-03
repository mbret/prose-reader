import { isShallowEqual, type Manifest } from "@prose-reader/shared"
import {
  filter,
  first,
  map,
  merge,
  type Observable,
  type ObservedValueOf,
  of,
  Subject,
  share,
  switchMap,
} from "rxjs"
import type { Context } from "../context/Context"
import type { HookManager } from "../hooks/HookManager"
import { isFullyPrePaginated } from "../manifest/isFullyPrePaginated"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { DestroyableClass } from "../utils/DestroyableClass"
import { deferNextResult } from "../utils/rxjs"
import type { Viewport } from "../viewport/Viewport"
import type { DocumentRenderer } from "./renderer/DocumentRenderer"

export class SpineItemLayout extends DestroyableClass {
  private layoutTriggerSubject = new Subject<{
    spreadPosition: "left" | "right" | "none"
    horizontalOffset: number
    isLastItem: boolean
  }>()

  private lastLayout: {
    width: number
    height: number
    pageSize: { width: number; height: number }
  } | null = null

  public readonly layout$

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

    const layoutProcess$ = this.layoutTriggerSubject.pipe(
      switchMap(({ spreadPosition, horizontalOffset, isLastItem }) => {
        const { blankPagePosition, minimumWidth } =
          this.computeLayoutInformation({ horizontalOffset, isLastItem })

        this.hookManager.execute(`item.onBeforeLayout`, undefined, {
          blankPagePosition,
          item: this.item,
          minimumWidth,
        })

        const rendererLayout$ = this.renderer.layout({
          blankPagePosition,
          minPageSpread: minimumWidth / this.viewport.pageSize.width,
          minimumWidth,
          spreadPosition,
        })

        return merge(
          of({ type: "start" } as const),
          rendererLayout$.pipe(
            this.applyDimsAfterLayout({ blankPagePosition, minimumWidth }),
            map(
              (data) =>
                ({
                  type: "end",
                  data,
                }) as const,
            ),
          ),
        )
      }),
      share(),
    )

    this.layout$ = layoutProcess$.pipe(
      filter((event) => event.type === `end`),
      map((event) => event.data),
      share(),
    )
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
  }: {
    isLastItem: boolean
    horizontalOffset: number
  }) => {
    let minimumWidth = this.viewport.value.pageSize.width
    let blankPagePosition: `none` | `before` | `after` = `none`
    const isScreenStartItem =
      horizontalOffset % this.viewport.absoluteViewport.width === 0
    const manifest = this.context.manifest
    const isGloballyPrePaginated = isFullyPrePaginated(manifest) ?? false

    if (this.settings.values.computedSpreadMode) {
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

      if (
        this.item.pageSpreadRight &&
        isScreenStartItem &&
        !this.context.isRTL()
      ) {
        blankPagePosition = `before`
        minimumWidth = this.viewport.value.pageSize.width * 2
      } else if (
        this.item.pageSpreadLeft &&
        isScreenStartItem &&
        this.context.isRTL()
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

  private applyDimsAfterLayout =
    ({
      blankPagePosition,
      minimumWidth,
    }: {
      blankPagePosition: `none` | `before` | `after`
      minimumWidth: number
    }) =>
    (stream: Observable<{ width: number; height: number } | undefined>) => {
      return stream.pipe(
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

          this.containerElement.style.width = `${safeWidth}px`
          this.containerElement.style.height = `${safeHeight}px`

          this.hookManager.execute(`item.onAfterLayout`, undefined, {
            blankPagePosition,
            item: this.item,
            minimumWidth,
          })

          return { width: safeWidth, height: safeHeight }
        }),
      )
    }

  public layout = (
    params: ObservedValueOf<typeof this.layoutTriggerSubject>,
  ) => {
    const nextResult = deferNextResult(this.layout$.pipe(first()))

    this.layoutTriggerSubject.next(params)

    return nextResult()
  }

  public adjustPositionOfElement = ({
    right,
    left,
    top,
  }: {
    right?: number
    left?: number
    top?: number
  }) => {
    if (right !== undefined) {
      this.containerElement.style.right = `${right}px`
    } else {
      this.containerElement.style.removeProperty(`right`)
    }
    if (left !== undefined) {
      this.containerElement.style.left = `${left}px`
    } else {
      this.containerElement.style.removeProperty(`left`)
    }
    if (top !== undefined) {
      this.containerElement.style.top = `${top}px`
    } else {
      this.containerElement.style.removeProperty(`top`)
    }
  }

  get layoutInfo() {
    const style = this.containerElement.style
    const width = style.width ? parseFloat(style.width) : 0
    const height = style.height ? parseFloat(style.height) : 0

    return {
      width,
      height,
    }
  }
}
