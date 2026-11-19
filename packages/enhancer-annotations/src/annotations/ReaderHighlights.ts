import { DestroyableClass, type Reader } from "@prose-reader/core"
import {
  BehaviorSubject,
  defaultIfEmpty,
  forkJoin,
  map,
  merge,
  type Observable,
  switchMap,
} from "rxjs"
import { SpineItemHighlights } from "./SpineItemHighlights.ts"
import type { RuntimeAnnotation } from "./types.ts"

export class ReaderHighlights extends DestroyableClass {
  /** The highlights of each spine item whose document is loaded, by item id. */
  private spineItemHighlightsByItemId = new BehaviorSubject<
    ReadonlyMap<string, SpineItemHighlights>
  >(new Map())
  private deregisterHooks: (() => void)[]

  public tap$: SpineItemHighlights["tap$"]

  constructor(
    private reader: Reader,
    private highlights: Observable<RuntimeAnnotation[]>,
    private selectedHighlight: Observable<string | undefined>,
  ) {
    super()

    const deregisterDocumentLoadHook = this.reader.hookManager.register(
      "item.onDocumentLoad",
      async ({ itemId }) => {
        this.destroySpineItemHighlights(itemId)

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

        this.spineItemHighlightsByItemId.next(
          new Map(this.spineItemHighlightsByItemId.value).set(
            itemId,
            spineItemHighlights,
          ),
        )
      },
    )

    const deregisterDocumentUnloadHook = this.reader.hookManager.register(
      "item.onDocumentUnload",
      ({ itemId }) => {
        this.destroySpineItemHighlights(itemId)
      },
    )

    this.deregisterHooks = [
      deregisterDocumentLoadHook,
      deregisterDocumentUnloadHook,
    ]

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

  public destroy() {
    super.destroy()

    for (const deregisterHook of this.deregisterHooks) deregisterHook()

    for (const spineItemHighlights of this.allSpineItemHighlights) {
      spineItemHighlights.destroy()
    }

    this.spineItemHighlightsByItemId.complete()
  }
}
