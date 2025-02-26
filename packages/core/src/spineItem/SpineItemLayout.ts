import { type Manifest, isShallowEqual } from "@prose-reader/shared"
import {
  type Observable,
  type ObservedValueOf,
  Subject,
  filter,
  first,
  map,
  merge,
  of,
  share,
  switchMap,
} from "rxjs"
import type { Context } from "../context/Context"
import type { HookManager } from "../hooks/HookManager"
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
          const safeHeight = this.validateDimension(
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

  /**
   * Returns the absolute layout position relative to the parent element which
   * is supposedly and expectedly the spine element.
   *
   * @important
   *
   * This method is stable and does not consider scalings or transforms on the parents.
   *
   * It does assume and requires that:
   * - the navigator element and the spine element are direct parents.
   * - the spine items are correctly positioned in the DOM and with correct styles values.
   */
  get layoutPosition() {
    const left = Math.round(this.containerElement.offsetLeft * 10) / 10
    const top = Math.round(this.containerElement.offsetTop * 10) / 10

    // offsetWidth/Height gives us the actual layout dimensions
    const width = Math.round(this.containerElement.offsetWidth * 10) / 10
    const height = Math.round(this.containerElement.offsetHeight * 10) / 10

    const normalizedValues = {
      left: left,
      top: top,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      width,
      height,
    }

    return normalizedValues
  }
}
