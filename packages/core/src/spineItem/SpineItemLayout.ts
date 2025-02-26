import type { Manifest } from "@prose-reader/shared"
import {
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
      switchMap(({ blankPagePosition, minimumWidth, spreadPosition }) => {
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
            map(({ height, width }) => {
              this.containerElement.style.width = `${width}px`
              this.containerElement.style.height = `${height}px`

              this.hookManager.execute(`item.onAfterLayout`, undefined, {
                blankPagePosition,
                item: this.item,
                minimumWidth,
              })

              return {
                type: "end",
                data: { width, height },
              } as const
            }),
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

  public layout = (
    params: ObservedValueOf<typeof this.layoutTriggerSubject>,
  ) => {
    const nextResult = deferNextResult(this.layout$.pipe(first()))

    this.layoutTriggerSubject.next(params)

    return nextResult()
  }
}
