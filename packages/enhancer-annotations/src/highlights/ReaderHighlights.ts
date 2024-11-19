import { DestroyableClass, Reader } from "@prose-reader/core"
import { BehaviorSubject, merge, switchMap } from "rxjs"
import { Highlight } from "../types"
import { SpineItemHighlights } from "./SpineItemHighlights"

export class ReaderHighlights extends DestroyableClass {
  private spineItemHighlights = new BehaviorSubject<SpineItemHighlights[]>([])

  public tap$: SpineItemHighlights["tap$"]

  constructor(
    private reader: Reader,
    private annotations: BehaviorSubject<Highlight[]>,
  ) {
    super()

    this.reader.hookManager.register("item.onDocumentLoad", ({ itemId, destroy }) => {
      const spineItem = reader.spineItemsManager.get(itemId)

      if (!spineItem) return

      const annotationLayer = new SpineItemHighlights(this.annotations, spineItem, reader)

      this.spineItemHighlights.next([...this.spineItemHighlights.getValue(), annotationLayer])

      const deregister = reader.hookManager.register("item.onAfterLayout", ({ item }) => {
        if (item.id !== itemId) return

        annotationLayer.layout()
      })

      destroy(() => {
        this.spineItemHighlights.next(this.spineItemHighlights.getValue().filter((layer) => layer !== annotationLayer))

        annotationLayer.destroy()

        deregister()
      })
    })

    this.tap$ = this.spineItemHighlights.pipe(switchMap((layers) => merge(...layers.map((layer) => layer.tap$))))
  }

  getHighlightsForTarget = (target: EventTarget) => {
    return this.spineItemHighlights
      .getValue()
      .flatMap((layer) => layer.getHighlightsForTarget(target))
      .map((annotation) => annotation.highlight)
  }
}
