import { distinctUntilChanged, map, merge, Observable, of, shareReplay, switchMap, takeUntil } from "rxjs"
import { DestroyableClass, Reader, SpineItem } from "@prose-reader/core"
import { SpineItemHighlight } from "./SpineItemHighlight"
import { createAnnotationLayer, layoutAnnotationLayer } from "./utils"
import { Highlight } from "./Highlight"

export class SpineItemHighlights extends DestroyableClass {
  private layer: HTMLElement
  private highlights: SpineItemHighlight[] = []

  public readonly tap$: SpineItemHighlight["tap$"]

  constructor(
    private highlights$: Observable<Highlight[]>,
    private spineItem: SpineItem,
    private reader: Reader,
    private selectedHighlight: Observable<string | undefined>,
  ) {
    super()

    const firstLayerElement = spineItem.renderer.layers[0]?.element ?? document.createElement("div")

    this.layer = createAnnotationLayer(this.spineItem.containerElement, firstLayerElement)

    const itemHighlights$ = this.highlights$.pipe(
      switchMap((annotations) => {
        this.highlights.forEach((highlight) => highlight.destroy())
        this.highlights = []

        annotations.forEach((annotation) => {
          if (annotation.itemIndex !== this.spineItem.item.index) return

          const isSelected$ = this.selectedHighlight.pipe(
            map((id) => id === annotation.id),
            distinctUntilChanged(),
          )

          const spineItemHighlight = new SpineItemHighlight(this.spineItem, this.layer, this.reader, annotation, isSelected$)

          this.highlights.push(spineItemHighlight)
        })

        return of(this.highlights)
      }),
      shareReplay(1),
      takeUntil(this.destroy$),
    )

    this.tap$ = itemHighlights$.pipe(switchMap((highlights) => merge(...highlights.map((highlight) => highlight.tap$))))

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
