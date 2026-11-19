import type { Reader } from "@prose-reader/core"
import {
  BehaviorSubject,
  combineLatest,
  defaultIfEmpty,
  forkJoin,
  map,
  merge,
  type Observable,
  of,
  shareReplay,
  switchMap,
} from "rxjs"
import type { AnnotationPage } from "../types.ts"
import { SpineItemHighlights } from "./SpineItemHighlights.ts"
import type { RuntimeAnnotation } from "./types.ts"

/**
 * The highlights of the spine items whose document is loaded. The reader
 * unloads every document when it is destroyed, which destroys them.
 */
export class ReaderHighlights {
  private spineItemHighlightsByItemId = new BehaviorSubject<
    ReadonlyMap<string, SpineItemHighlights>
  >(new Map())

  public tap$: SpineItemHighlights["tap$"]

  /** The pages of the annotations of every spine item whose document is loaded. */
  public pageByAnnotationId$: Observable<ReadonlyMap<string, AnnotationPage>>

  constructor(
    private reader: Reader,
    private annotations$: Observable<RuntimeAnnotation[]>,
    private selectedAnnotationId$: Observable<string | undefined>,
  ) {
    this.reader.hookManager.register(
      "item.onDocumentLoad",
      async ({ itemId }) => {
        this.destroySpineItemHighlights(itemId)

        const spineItem = reader.spineItemsManager.get(itemId)

        if (!spineItem) return

        const spineItemAnnotations$ = this.annotations$.pipe(
          map((annotations) =>
            annotations.filter(
              (annotation) => annotation.itemIndex === spineItem.item.index,
            ),
          ),
        )

        const spineItemHighlights = new SpineItemHighlights(
          spineItemAnnotations$,
          spineItem,
          reader,
          this.selectedAnnotationId$,
        )

        this.spineItemHighlightsByItemId.next(
          new Map(this.spineItemHighlightsByItemId.value).set(
            itemId,
            spineItemHighlights,
          ),
        )
      },
    )

    this.reader.hookManager.register("item.onDocumentUnload", ({ itemId }) => {
      this.destroySpineItemHighlights(itemId)
    })

    this.pageByAnnotationId$ = this.spineItemHighlightsByItemId.pipe(
      switchMap((spineItemHighlightsByItemId) => {
        const pageByAnnotationIdOfEachItem = Array.from(
          spineItemHighlightsByItemId.values(),
          (spineItemHighlights) => spineItemHighlights.pageByAnnotationId$,
        )

        return pageByAnnotationIdOfEachItem.length === 0
          ? of([])
          : combineLatest(pageByAnnotationIdOfEachItem)
      }),
      map(
        (pageByAnnotationIdOfEachItem): ReadonlyMap<string, AnnotationPage> =>
          new Map(
            pageByAnnotationIdOfEachItem.flatMap((pageByAnnotationId) =>
              Array.from(pageByAnnotationId),
            ),
          ),
      ),
      shareReplay({ refCount: true, bufferSize: 1 }),
    )

    this.tap$ = this.spineItemHighlightsByItemId.pipe(
      switchMap((spineItemHighlightsByItemId) =>
        merge(
          ...Array.from(
            spineItemHighlightsByItemId.values(),
            (spineItemHighlights) => spineItemHighlights.tap$,
          ),
        ),
      ),
    )
  }

  private get allSpineItemHighlights() {
    return Array.from(this.spineItemHighlightsByItemId.value.values())
  }

  private destroySpineItemHighlights(itemId: string) {
    const spineItemHighlights =
      this.spineItemHighlightsByItemId.value.get(itemId)

    if (!spineItemHighlights) return

    const spineItemHighlightsByItemId = new Map(
      this.spineItemHighlightsByItemId.value,
    )

    spineItemHighlightsByItemId.delete(itemId)
    this.spineItemHighlightsByItemId.next(spineItemHighlightsByItemId)
    spineItemHighlights.destroy()
  }

  getHighlightsForTarget = (target: EventTarget) => {
    return this.allSpineItemHighlights
      .flatMap((spineItemHighlights) =>
        spineItemHighlights.getHighlightsForTarget(target),
      )
      .map((highlight) => highlight.annotation)
  }

  isTargetWithinHighlight = (target: EventTarget) => {
    return !!this.getHighlightsForTarget(target).length
  }

  public layout() {
    return forkJoin(
      this.allSpineItemHighlights.map((spineItemHighlights) =>
        spineItemHighlights.layout(),
      ),
    ).pipe(defaultIfEmpty(null))
  }
}
