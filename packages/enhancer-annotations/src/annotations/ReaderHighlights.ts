import { DestroyableClass, type Reader } from "@prose-reader/core"
import {
  BehaviorSubject,
  defaultIfEmpty,
  forkJoin,
  map,
  merge,
  type Observable,
  switchMap,
  takeUntil,
} from "rxjs"
import { SpineItemHighlights } from "./SpineItemHighlights.ts"
import type { RuntimeAnnotation } from "./types.ts"

export class ReaderHighlights extends DestroyableClass {
  private spineItemHighlights = new BehaviorSubject<SpineItemHighlights[]>([])

  /**
   * Emits the highlights of an item each time they change to match its
   * annotations, and once when its document starts to load. Each emission
   * follows the change, so a draw it starts draws the current highlights.
   */
  public readonly highlightsChange$: SpineItemHighlights["highlights$"] =
    this.spineItemHighlights.pipe(
      switchMap((layers) => merge(...layers.map((layer) => layer.highlights$))),
    )

  public tap$: SpineItemHighlights["tap$"]

  constructor(
    private reader: Reader,
    private highlights: Observable<RuntimeAnnotation[]>,
    private selectedHighlight: Observable<string | undefined>,
  ) {
    super()

    const cleanupByItemId = new Map<string, () => void>()

    this.reader.hookManager.register(
      "item.onDocumentLoad",
      async ({ itemId }) => {
        cleanupByItemId.get(itemId)?.()
        cleanupByItemId.delete(itemId)

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

        const cleanup = () => {
          this.spineItemHighlights.next(
            this.spineItemHighlights
              .getValue()
              .filter((layer) => layer !== spineItemHighlights),
          )

          spineItemHighlights.destroy()
        }

        cleanupByItemId.set(itemId, cleanup)
      },
    )

    this.reader.hookManager.register("item.onDocumentUnload", ({ itemId }) => {
      cleanupByItemId.get(itemId)?.()
      cleanupByItemId.delete(itemId)
    })

    this.tap$ = this.spineItemHighlights.pipe(
      switchMap((layers) => merge(...layers.map((layer) => layer.tap$))),
      takeUntil(this.destroy$),
    )
  }

  getHighlightsForTarget = (target: EventTarget) => {
    return this.spineItemHighlights
      .getValue()
      .flatMap((layer) => layer.getHighlightsForTarget(target))
      .map((highlight) => highlight.annotation)
  }

  isTargetWithinHighlight = (target: EventTarget) => {
    return !!this.getHighlightsForTarget(target).length
  }

  public layout() {
    return forkJoin(
      this.spineItemHighlights.value.map((item) => item.layout()),
    ).pipe(defaultIfEmpty(null))
  }
}
