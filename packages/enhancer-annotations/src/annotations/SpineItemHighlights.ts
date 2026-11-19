import {
  DestroyableClass,
  type Reader,
  type SpineItem,
} from "@prose-reader/core"
import {
  BehaviorSubject,
  defaultIfEmpty,
  distinctUntilChanged,
  forkJoin,
  map,
  merge,
  type Observable,
  scan,
  switchMap,
  takeUntil,
} from "rxjs"
import { SpineItemHighlight } from "./SpineItemHighlight.ts"
import type { RuntimeAnnotation } from "./types.ts"
import { createAnnotationLayer, layoutAnnotationLayer } from "./utils.ts"

/**
 * The highlights of a spine item's loaded document, in a layer over it: one
 * per annotation of the item, from its creation until `destroy()`.
 */
export class SpineItemHighlights extends DestroyableClass {
  private readonly layer: HTMLElement
  /** One highlight per annotation of the item, in the order of the list. */
  private readonly highlights = new BehaviorSubject<SpineItemHighlight[]>([])

  public readonly tap$: SpineItemHighlight["tap$"]

  /**
   * @param annotations$ The annotations of this item, each list replacing the
   * previous one.
   */
  constructor(
    annotations$: Observable<RuntimeAnnotation[]>,
    private readonly spineItem: SpineItem,
    private readonly reader: Reader,
    private readonly selectedHighlight: Observable<string | undefined>,
  ) {
    super()

    const firstLayerElement =
      spineItem.renderer.documentContainer ?? document.createElement("div")

    this.layer = createAnnotationLayer(
      this.spineItem.containerElement,
      firstLayerElement,
    )

    this.tap$ = this.highlights.pipe(
      switchMap((highlights) =>
        merge(...highlights.map((highlight) => highlight.tap$)),
      ),
      takeUntil(this.destroy$),
    )

    annotations$
      .pipe(
        scan<RuntimeAnnotation[], SpineItemHighlight[]>(
          (previousHighlights, annotations) =>
            this.reconcileHighlightsWithAnnotations(
              previousHighlights,
              annotations,
            ),
          [],
        ),
        takeUntil(this.destroy$),
      )
      .subscribe((highlights) => {
        this.highlights.next(highlights)
      })
  }

  /**
   * The highlights of `annotations`, one per id. An annotation keeps its
   * highlight, given its new data, as long as its cfi is the same: the
   * highlight resolved that cfi in the document. Every other highlight of
   * `previousHighlights` is destroyed.
   */
  private reconcileHighlightsWithAnnotations(
    previousHighlights: SpineItemHighlight[],
    annotations: RuntimeAnnotation[],
  ) {
    const reusableHighlightByAnnotationId = new Map(
      previousHighlights.map((highlight) => [
        highlight.annotation.id,
        highlight,
      ]),
    )
    const annotationById = new Map(
      annotations.map((annotation) => [annotation.id, annotation]),
    )

    const highlights = Array.from(annotationById.values(), (annotation) => {
      const previousHighlight = reusableHighlightByAnnotationId.get(
        annotation.id,
      )

      if (previousHighlight?.annotation.cfi !== annotation.cfi) {
        return this.createHighlight(annotation)
      }

      reusableHighlightByAnnotationId.delete(annotation.id)
      previousHighlight.annotation = annotation

      return previousHighlight
    })

    for (const highlightNotReused of reusableHighlightByAnnotationId.values()) {
      highlightNotReused.destroy()
    }

    return highlights
  }

  private createHighlight(annotation: RuntimeAnnotation) {
    const isSelected$ = this.selectedHighlight.pipe(
      map((id) => id === annotation.id),
      distinctUntilChanged(),
    )

    return new SpineItemHighlight(
      this.spineItem,
      this.layer,
      this.reader,
      annotation,
      isSelected$,
    )
  }

  layout() {
    const firstLayerElement =
      this.spineItem.renderer.documentContainer ?? document.createElement("div")

    layoutAnnotationLayer(firstLayerElement, this.layer)

    return forkJoin(
      this.highlights.value.map((highlight) => highlight.render()),
    ).pipe(defaultIfEmpty(null))
  }

  getHighlightsForTarget(target: EventTarget) {
    return this.highlights.value.filter(
      (highlight) => target instanceof Node && highlight.isWithinTarget(target),
    )
  }

  destroy() {
    super.destroy()

    const highlights = this.highlights.value

    this.highlights.next([])

    for (const highlight of highlights) {
      highlight.destroy()
    }

    this.layer.remove()
  }
}
