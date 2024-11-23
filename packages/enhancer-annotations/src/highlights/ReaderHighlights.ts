import { DestroyableClass, Reader } from "@prose-reader/core"
import { BehaviorSubject, map, merge, switchMap } from "rxjs"
import { SpineItemHighlights } from "./SpineItemHighlights"
import { Highlight } from "./Highlight"

export class ReaderHighlights extends DestroyableClass {
  private spineItemHighlights = new BehaviorSubject<SpineItemHighlights[]>([])

  public tap$: SpineItemHighlights["tap$"]

  constructor(
    private reader: Reader,
    private highlights: BehaviorSubject<Highlight[]>,
    private selectedHighlight: BehaviorSubject<string | undefined>,
  ) {
    super()

    this.reader.hookManager.register("item.onDocumentLoad", ({ itemId, destroy }) => {
      const spineItem = reader.spineItemsManager.get(itemId)

      if (!spineItem) return

      const spineItemHighlights$ = this.highlights.pipe(
        map((highlights) => highlights.filter((highlight) => highlight.itemIndex === spineItem.item.index)),
      )

      const spineItemHighlights = new SpineItemHighlights(spineItemHighlights$, spineItem, reader, this.selectedHighlight)

      this.spineItemHighlights.next([...this.spineItemHighlights.getValue(), spineItemHighlights])

      const deregister = reader.hookManager.register("item.onAfterLayout", ({ item }) => {
        if (item.id !== itemId) return

        spineItemHighlights.layout()
      })

      destroy(() => {
        this.spineItemHighlights.next(this.spineItemHighlights.getValue().filter((layer) => layer !== spineItemHighlights))

        spineItemHighlights.destroy()

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

  isTargetWithinHighlight = (target: EventTarget) => {
    return !!this.getHighlightsForTarget(target).length
  }
}
