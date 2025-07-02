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
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { DestroyableClass } from "../utils/DestroyableClass"
import { deferNextResult } from "../utils/rxjs"
import type { DocumentRenderer } from "./renderer/DocumentRenderer"

export class SpineItemLayout extends DestroyableClass {
  private layoutTriggerSubject = new Subject<{
    blankPagePosition: `before` | `after` | `none`
    minimumWidth: number
    spreadPosition: `left` | `right` | `none`
  }>()

  private lastLayout: {
    width: number
    height: number
    pageSize: { width: number; height: number }
  } | null = null

  public readonly layout$
  public readonly layoutProcess$

  constructor(
    public item: Manifest[`spineItems`][number],
    public containerElement: HTMLElement,
    public context: Context,
    public hookManager: HookManager,
    public renderer: DocumentRenderer,
    public settings: ReaderSettingsManager,
  ) {
    super()

    this.layoutProcess$ = this.layoutTriggerSubject.pipe(
      switchMap((params) => {
        const { blankPagePosition, minimumWidth, spreadPosition } = params

        this.hookManager.execute(`item.onBeforeLayout`, undefined, {
          blankPagePosition,
          item: this.item,
          minimumWidth,
        })

        const rendererLayout$ = this.renderer.layout({
          blankPagePosition,
          minPageSpread: minimumWidth / this.context.getPageSize().width,
          minimumWidth,
          spreadPosition,
        })

        return merge(
          of({ type: "start" } as const),
          rendererLayout$.pipe(
            this.applyDimsAfterLayout(params),
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

    this.layout$ = this.layoutProcess$.pipe(
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

  private applyDimsAfterLayout =
    ({
      blankPagePosition,
      minimumWidth,
    }: ObservedValueOf<typeof this.layoutTriggerSubject>) =>
    (stream: Observable<{ width: number; height: number } | undefined>) => {
      return stream.pipe(
        map((dims) => {
          const trustableLastLayout = isShallowEqual(
            this.lastLayout?.pageSize,
            this.context.getPageSize(),
          )
            ? this.lastLayout
            : undefined

          const { width: previousWidth, height: previousHeight } =
            trustableLastLayout ?? {}
          const { width = previousWidth, height = previousHeight } = dims ?? {}
          const { width: pageSizeWidth, height: pageSizeHeight } =
            this.context.getPageSize()

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
            pageSize: this.context.getPageSize(),
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
