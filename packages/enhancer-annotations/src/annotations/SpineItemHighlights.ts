import {
  DestroyableClass,
  type Reader,
  type SpineItem,
} from "@prose-reader/core"
import {
  BehaviorSubject,
  defaultIfEmpty,
  distinctUntilChanged,
  endWith,
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
 * The highlights of a spine item's loaded document, one per annotation of
 * the item, in a layer over it.
 */
export class SpineItemHighlights extends DestroyableClass {
  private readonly layer: HTMLElement
  private readonly highlights = new BehaviorSubject<SpineItemHighlight[]>([])

  /**
   * The highlights each time they change to match the annotations, ready to
   * draw. Completes on `destroy()`.
   */
  public readonly highlights$ = this.highlights.asObservable()

  public readonly tap$: SpineItemHighlight["tap$"]

  /**
   * @param annotations$ The annotations of this item, each list replacing the
   * previous one.
   */
  constructor(
    annotations$: Observable<RuntimeAnnotation[]>,
    private readonly spineItem: SpineItem,
    private readonly reader: Reader,
    private readonly selectedHighlightId$: Observable<string | undefined>,
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

    /**
     * On `destroy()`, an empty list ends the pipeline, and its reconciliation
     * destroys every highlight.
     */
    annotations$
      .pipe(
        takeUntil(this.destroy$),
        endWith([]),
        scan<RuntimeAnnotation[], SpineItemHighlight[]>(
          (previousHighlights, annotations) =>
            this.reconcileHighlightsWithAnnotations(
              previousHighlights,
              annotations,
            ),
          [],
        ),
      )
      .subscribe(this.highlights)
  }

  /**
   * The highlights of `annotations`, one per id. An annotation keeps its
   * highlight, given its new data, while its cfi is the same. Every other
   * highlight of `previousHighlights` is destroyed.
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

      if (previousHighlight?.cfi !== annotation.cfi) {
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
    const isSelected$ = this.selectedHighlightId$.pipe(
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

    this.layer.remove()
  }
}
