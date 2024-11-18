import { Observable, takeUntil, tap } from "rxjs"
import { RuntimeHighlight } from "../types"
import { DestroyableClass, Reader, SpineItem } from "@prose-reader/core"
import { createAnnotationLayer, layoutAnnotationLayer } from "./utils"
import { Highlight } from "../highlights/Highlight"

export class AnnotationLayer extends DestroyableClass {
  private layer: HTMLElement
  private annotations: Highlight[] = []

  constructor(
    private annotations$: Observable<RuntimeHighlight[]>,
    private spineItem: SpineItem,
    private reader: Reader,
  ) {
    super()

    const firstLayerElement = spineItem.renderer.layers[0]?.element ?? document.createElement("div")

    this.layer = createAnnotationLayer(this.spineItem.containerElement, firstLayerElement)

    this.annotations$
      .pipe(
        tap((annotations) => {
          this.annotations.forEach((highlight) => highlight.destroy())
          this.annotations = []

          annotations.forEach((annotation) => {
            if (annotation.itemId !== this.spineItem.item.id) return

            this.annotations.push(new Highlight(this.spineItem, this.layer, this.reader, annotation))
          })
        }),
        takeUntil(this.destroy$),
      )
      .subscribe()
  }

  render() {
    const firstLayerElement = this.spineItem.renderer.layers[0]?.element ?? document.createElement("div")

    layoutAnnotationLayer(firstLayerElement, this.layer)

    this.annotations.forEach((highlight) => highlight.render())
  }

  getHighlightsForTarget(target: EventTarget) {
    return this.annotations.filter((highlight) => target instanceof Node && highlight.isWithinTarget(target))
  }

  destroy() {
    super.destroy()

    this.layer.remove()
  }
}
