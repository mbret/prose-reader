import { DestroyableClass, Reader } from "@prose-reader/core"
import { BehaviorSubject } from "rxjs"
import { Highlight } from "../types"
import { AnnotationLayer } from "./AnnotationLayer"

export class AnnotationLayers extends DestroyableClass {
  private annotationLayers: AnnotationLayer[] = []

  constructor(
    private reader: Reader,
    private annotations: BehaviorSubject<Highlight[]>,
  ) {
    super()

    this.reader.hookManager.register("item.onDocumentLoad", ({ itemId, destroy }) => {
      const spineItem = reader.spineItemsManager.get(itemId)

      if (!spineItem) return

      const annotationLayer = new AnnotationLayer(this.annotations, spineItem, reader)

      this.annotationLayers.push(annotationLayer)

      const deregister = reader.hookManager.register("item.onAfterLayout", ({ item }) => {
        if (item.id !== itemId) return

        annotationLayer.render()
      })

      destroy(() => {
        this.annotationLayers = this.annotationLayers.filter((layer) => layer !== annotationLayer)
        annotationLayer.destroy()

        deregister()
      })
    })
  }

  getHighlightsForTarget(target: EventTarget) {
    return this.annotationLayers
      .flatMap((layer) => layer.getHighlightsForTarget(target))
      .map((annotation) => annotation.annotation)
  }
}
