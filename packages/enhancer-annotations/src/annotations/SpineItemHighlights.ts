import {
  DestroyableClass,
  type Reader,
  type SpineItem,
} from "@prose-reader/core"
import {
  BehaviorSubject,
  combineLatest,
  defaultIfEmpty,
  distinctUntilChanged,
  forkJoin,
  map,
  merge,
  type Observable,
  shareReplay,
  startWith,
  switchMap,
  takeUntil,
} from "rxjs"
import type { AnnotationPage } from "../types.ts"
import { SpineItemHighlight } from "./SpineItemHighlight.ts"
import type { RuntimeAnnotation } from "./types.ts"
import { createAnnotationLayer, layoutAnnotationLayer } from "./utils.ts"

/**
 * One highlight per annotation id, from the first list of `annotations$` that
 * holds the id to the first list that does not. When a list holds an id more
 * than once, its last entry wins.
 */
export class SpineItemHighlights extends DestroyableClass {
  private layer: HTMLElement
  private highlightsByAnnotationId = new BehaviorSubject<
    ReadonlyMap<string, SpineItemHighlight>
  >(new Map())

  public readonly tap$: SpineItemHighlight["tap$"]

  /**
   * The page of each annotation of the item whose page is known, found again
   * when the list changes and after each layout of the item.
   */
  public readonly pageByAnnotationId$: Observable<
    ReadonlyMap<string, AnnotationPage>
  >

  constructor(
    annotations$: Observable<RuntimeAnnotation[]>,
    private spineItem: SpineItem,
    private reader: Reader,
    private selectedAnnotationId$: Observable<string | undefined>,
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

    this.pageByAnnotationId$ = combineLatest([
      annotations$,
      spineItem.didLayout$.pipe(startWith(null)),
    ]).pipe(
      map(([annotations]) => {
        const pageByAnnotationId = new Map<string, AnnotationPage>()

        for (const annotation of annotations) {
          const pageIndex = reader.cfi.getSpineItemPageIndexFromCfi(
            annotation.cfi,
          )

          if (pageIndex !== undefined) {
            pageByAnnotationId.set(annotation.id, {
              itemIndex: spineItem.index,
              pageIndex,
            })
          }
        }

        return pageByAnnotationId
      }),
      takeUntil(this.destroy$),
      shareReplay({ refCount: true, bufferSize: 1 }),
    )

    annotations$.pipe(takeUntil(this.destroy$)).subscribe((annotations) => {
      this.highlightsByAnnotationId.next(
        this.reconcileHighlightsWithAnnotations(annotations),
      )
    })
  }

  private reconcileHighlightsWithAnnotations(annotations: RuntimeAnnotation[]) {
    const previousHighlightsByAnnotationId = this.highlightsByAnnotationId.value
    const annotationsById = new Map(
      annotations.map((annotation) => [annotation.id, annotation]),
    )

    for (const [annotationId, highlight] of previousHighlightsByAnnotationId) {
      if (!annotationsById.has(annotationId)) highlight.destroy()
    }

    return new Map(
      Array.from(
        annotationsById,
        ([annotationId, annotation]): [string, SpineItemHighlight] => {
          const existingHighlight =
            previousHighlightsByAnnotationId.get(annotationId)

          existingHighlight?.update(annotation)

          return [
            annotationId,
            existingHighlight ?? this.createHighlight(annotation),
          ]
        },
      ),
    )
  }

  private createHighlight(annotation: RuntimeAnnotation) {
    const isSelected$ = this.selectedAnnotationId$.pipe(
      map((id) => id === annotation.id),
      distinctUntilChanged(),
    )

    return new SpineItemHighlight(
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

    this.highlightsByAnnotationId.next(new Map())
    this.highlightsByAnnotationId.complete()
    this.layer.remove()
  }
}
