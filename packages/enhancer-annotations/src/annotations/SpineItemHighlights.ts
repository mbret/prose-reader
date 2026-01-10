import {
  DestroyableClass,
  type Reader,
  type SpineItem,
} from "@prose-reader/core"
import {
  defaultIfEmpty,
  distinctUntilChanged,
  forkJoin,
  map,
  merge,
  type Observable,
  of,
  shareReplay,
  switchMap,
  takeUntil,
} from "rxjs"
import { SpineItemHighlight } from "./SpineItemHighlight"
import type { RuntimeAnnotation } from "./types"
import { createAnnotationLayer, layoutAnnotationLayer } from "./utils"

export class SpineItemHighlights extends DestroyableClass {
  private layer: HTMLElement
  private highlights: SpineItemHighlight[] = []

  public readonly tap$: SpineItemHighlight["tap$"]

  constructor(
    private annotations$: Observable<RuntimeAnnotation[]>,
    private spineItem: SpineItem,
    private reader: Reader,
    private selectedHighlight: Observable<string | undefined>,
  ) {
    super()

    const firstLayerElement =
      spineItem.renderer.documentContainer ?? document.createElement("div")

    this.layer = createAnnotationLayer(
      this.spineItem.containerElement,
      firstLayerElement,
    )

    const itemHighlights$ = this.annotations$.pipe(
      switchMap((annotations) => {
        const newAnnotations = annotations.filter(
          (annotation) =>
            !this.highlights.some(
              (highlight) => highlight.highlight.id === annotation.id,
            ),
        )
        const oldAnnotations = this.highlights.filter(
          (highlight) =>
            highlight.highlight.itemIndex !== this.spineItem.item.index,
        )

        this.highlights.forEach((highlight, index) => {
          const existingAnnotation = annotations.find(
            (annotation) => annotation.id === highlight.highlight.id,
          )

          if (oldAnnotations.includes(highlight)) {
            highlight.destroy()
            this.highlights = this.highlights.splice(index, 1)
          }

          if (existingAnnotation) {
            highlight.highlight = existingAnnotation
          }
        })

        newAnnotations.forEach((annotation) => {
          if (annotation.itemIndex !== this.spineItem.item.index) return

          const isSelected$ = this.selectedHighlight.pipe(
            map((id) => id === annotation.id),
            distinctUntilChanged(),
          )

          const spineItemHighlight = new SpineItemHighlight(
            this.spineItem,
            this.layer,
            this.reader,
            annotation,
            isSelected$,
          )

          this.highlights.push(spineItemHighlight)
        })

        return of(this.highlights)
      }),
      shareReplay(1),
      takeUntil(this.destroy$),
    )

    this.tap$ = itemHighlights$.pipe(
      switchMap((highlights) =>
        merge(...highlights.map((highlight) => highlight.tap$)),
      ),
    )

    annotations$.subscribe()
  }

  layout() {
    const firstLayerElement =
      this.spineItem.renderer.documentContainer ?? document.createElement("div")

    layoutAnnotationLayer(firstLayerElement, this.layer)

    return forkJoin(
      this.highlights.map((highlight) => highlight.render()),
    ).pipe(defaultIfEmpty(null))
  }

  getHighlightsForTarget(target: EventTarget) {
    return this.highlights.filter(
      (highlight) => target instanceof Node && highlight.isWithinTarget(target),
    )
  }

  destroy() {
    super.destroy()

    this.layer.remove()
  }
}
