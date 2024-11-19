import { merge, Observable, of, shareReplay, switchMap, takeUntil } from "rxjs"
import { RuntimeHighlight } from "../types"
import { DestroyableClass, Reader, SpineItem } from "@prose-reader/core"
import { SpineItemHighlight } from "./SpineItemHighlight"
import { createAnnotationLayer, layoutAnnotationLayer } from "./utils"

export class SpineItemHighlights extends DestroyableClass {
  private layer: HTMLElement
  private highlights: SpineItemHighlight[] = []

  public readonly tap$: SpineItemHighlight["tap$"]

  constructor(
    private annotations$: Observable<RuntimeHighlight[]>,
    private spineItem: SpineItem,
    private reader: Reader,
  ) {
    super()

    const firstLayerElement = spineItem.renderer.layers[0]?.element ?? document.createElement("div")

    this.layer = createAnnotationLayer(this.spineItem.containerElement, firstLayerElement)

    const highlights$ = this.annotations$.pipe(
      switchMap((annotations) => {
        this.highlights.forEach((highlight) => highlight.destroy())
        this.highlights = []

        annotations.forEach((annotation) => {
          if (annotation.itemId !== this.spineItem.item.id) return

          this.highlights.push(new SpineItemHighlight(this.spineItem, this.layer, this.reader, annotation))
        })

        return of(this.highlights)
      }),
      shareReplay(1),
      takeUntil(this.destroy$),
    )

    this.tap$ = highlights$.pipe(switchMap((highlights) => merge(...highlights.map((highlight) => highlight.tap$))))

    highlights$.subscribe()
  }

  layout() {
    const firstLayerElement = this.spineItem.renderer.layers[0]?.element ?? document.createElement("div")

    layoutAnnotationLayer(firstLayerElement, this.layer)

    this.highlights.forEach((highlight) => highlight.render())
  }

  getHighlightsForTarget(target: EventTarget) {
    return this.highlights.filter((highlight) => target instanceof Node && highlight.isWithinTarget(target))
  }

  destroy() {
    super.destroy()

    this.layer.remove()
  }
}
