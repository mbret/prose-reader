import { DestroyableClass, type Reader } from "@prose-reader/core"
import { BehaviorSubject, map, merge, switchMap } from "rxjs"
import type { ProseHighlight } from "./Highlight"
import { SpineItemHighlights } from "./SpineItemHighlights"

export class ReaderHighlights extends DestroyableClass {
  private spineItemHighlights = new BehaviorSubject<SpineItemHighlights[]>([])

  public tap$: SpineItemHighlights["tap$"]

  constructor(
    private reader: Reader,
    private highlights: BehaviorSubject<ProseHighlight[]>,
    private selectedHighlight: BehaviorSubject<string | undefined>,
  ) {
    super()

    this.reader.hookManager.register(
      "item.onDocumentLoad",
      ({ itemId, destroy }) => {
        const spineItem = reader.spineItemsManager.get(itemId)

        if (!spineItem) return

        const spineItemHighlights$ = this.highlights.pipe(
          map((highlights) =>
            highlights.filter(
              (highlight) => highlight.itemIndex === spineItem.item.index,
            ),
          ),
        )

        const spineItemHighlights = new SpineItemHighlights(
          spineItemHighlights$,
          spineItem,
          reader,
          this.selectedHighlight,
        )

        this.spineItemHighlights.next([
          ...this.spineItemHighlights.getValue(),
          spineItemHighlights,
        ])

        destroy(() => {
          this.spineItemHighlights.next(
            this.spineItemHighlights
              .getValue()
              .filter((layer) => layer !== spineItemHighlights),
          )

          spineItemHighlights.destroy()
        })
      },
    )

    this.tap$ = this.spineItemHighlights.pipe(
      switchMap((layers) => merge(...layers.map((layer) => layer.tap$))),
    )
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

  public layout() {
    this.spineItemHighlights.value.forEach((item) => item.layout())
  }
}
