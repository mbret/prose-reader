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
  switchMap,
  takeUntil,
} from "rxjs"
import { SpineItemHighlight } from "./SpineItemHighlight.ts"
import type { RuntimeAnnotation } from "./types.ts"
import { createAnnotationLayer, layoutAnnotationLayer } from "./utils.ts"

/**
 * The highlights of the annotations of one spine item, while its document is
 * loaded: one highlight for each annotation of the item, from the moment its
 * id enters the list to the moment it leaves it.
 */
export class SpineItemHighlights extends DestroyableClass {
  private layer: HTMLElement
  /**
   * The highlights by annotation id. Only the subscription to the item's
   * annotations writes it, with each new list.
   */
  private highlightsByAnnotationId = new BehaviorSubject<
    ReadonlyMap<string, SpineItemHighlight>
  >(new Map())

  public readonly tap$: SpineItemHighlight["tap$"]

  constructor(
    annotations$: Observable<RuntimeAnnotation[]>,
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

    this.tap$ = this.highlightsByAnnotationId.pipe(
      switchMap((highlightsByAnnotationId) =>
        merge(
          ...Array.from(
            highlightsByAnnotationId.values(),
            (highlight) => highlight.tap$,
          ),
        ),
      ),
    )

    annotations$.pipe(takeUntil(this.destroy$)).subscribe((annotations) => {
      this.highlightsByAnnotationId.next(
        this.reconcileHighlightsWithAnnotations(annotations),
      )
    })
  }

  /**
   * Creates the highlights of the ids new to the list, gives the others their
   * new annotation, and destroys the highlights whose id left the list.
   */
  private reconcileHighlightsWithAnnotations(annotations: RuntimeAnnotation[]) {
    const previousHighlightsByAnnotationId = this.highlightsByAnnotationId.value
    const highlightsByAnnotationId = new Map<string, SpineItemHighlight>()

    for (const annotation of annotations) {
      const existingHighlight =
        highlightsByAnnotationId.get(annotation.id) ??
        previousHighlightsByAnnotationId.get(annotation.id)

      if (existingHighlight) {
        existingHighlight.update(annotation)
      }

      highlightsByAnnotationId.set(
        annotation.id,
        existingHighlight ?? this.createHighlight(annotation),
      )
    }

    for (const [annotationId, highlight] of previousHighlightsByAnnotationId) {
      if (!highlightsByAnnotationId.has(annotationId)) highlight.destroy()
    }

    return highlightsByAnnotationId
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

  private get highlights() {
    return Array.from(this.highlightsByAnnotationId.value.values())
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

    for (const highlight of this.highlights) highlight.destroy()

    this.highlightsByAnnotationId.complete()
    this.layer.remove()
  }
}
