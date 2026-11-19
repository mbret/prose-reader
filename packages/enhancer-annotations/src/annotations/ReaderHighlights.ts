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

/**
 * The highlights of the reader: one `SpineItemHighlights` for each spine item
 * whose document is loaded, from the load of the document to its release.
 */
export class ReaderHighlights extends DestroyableClass {
  private readonly spineItemHighlightsByItemId = new BehaviorSubject<
    ReadonlyMap<string, SpineItemHighlights>
  >(new Map())
  private readonly deregisterHooks: (() => void)[]

  /**
   * Emits the highlights of an item each time they change to match its
   * annotations, and once when its document starts to load. Each emission
   * follows the change, so a draw it starts draws the current highlights.
   */
  public readonly highlightsChange$: SpineItemHighlights["highlights$"] =
    this.spineItemHighlightsByItemId.pipe(
      switchMap((spineItemHighlightsByItemId) =>
        merge(
          ...Array.from(
            spineItemHighlightsByItemId.values(),
            (spineItemHighlights) => spineItemHighlights.highlights$,
          ),
        ),
      ),
    )

  public readonly tap$: SpineItemHighlights["tap$"] =
    this.spineItemHighlightsByItemId.pipe(
      switchMap((spineItemHighlightsByItemId) =>
        merge(
          ...Array.from(
            spineItemHighlightsByItemId.values(),
            (spineItemHighlights) => spineItemHighlights.tap$,
          ),
        ),
      ),
      takeUntil(this.destroy$),
    )

  constructor(
    reader: Reader,
    annotations$: Observable<RuntimeAnnotation[]>,
    selectedHighlightId$: Observable<string | undefined>,
  ) {
    super()

    this.deregisterHooks = [
      reader.hookManager.register("item.onDocumentLoad", async ({ itemId }) => {
        const spineItem = reader.spineItemsManager.get(itemId)

        if (!spineItem) {
          this.replaceSpineItemHighlights(itemId, undefined)

          return
        }

        const annotationsOfItem$ = annotations$.pipe(
          map((annotations) =>
            annotations.filter(
              (annotation) => annotation.itemIndex === spineItem.item.index,
            ),
          ),
        )

        this.replaceSpineItemHighlights(
          itemId,
          new SpineItemHighlights(
            annotationsOfItem$,
            spineItem,
            reader,
            selectedHighlightId$,
          ),
        )
      }),
      reader.hookManager.register("item.onDocumentUnload", ({ itemId }) => {
        this.replaceSpineItemHighlights(itemId, undefined)
      }),
    ]
  }

  /**
   * Gives the item `spineItemHighlights`, or none, and destroys the ones it
   * had.
   */
  private replaceSpineItemHighlights(
    itemId: string,
    spineItemHighlights: SpineItemHighlights | undefined,
  ) {
    const previousSpineItemHighlightsByItemId =
      this.spineItemHighlightsByItemId.value
    const previousSpineItemHighlights =
      previousSpineItemHighlightsByItemId.get(itemId)

    if (!previousSpineItemHighlights && !spineItemHighlights) return

    const spineItemHighlightsByItemId = new Map(
      previousSpineItemHighlightsByItemId,
    )

    if (spineItemHighlights) {
      spineItemHighlightsByItemId.set(itemId, spineItemHighlights)
    } else {
      spineItemHighlightsByItemId.delete(itemId)
    }

    this.spineItemHighlightsByItemId.next(spineItemHighlightsByItemId)

    previousSpineItemHighlights?.destroy()
  }

  isTargetWithinHighlight = (target: EventTarget) => {
    return Array.from(this.spineItemHighlightsByItemId.value.values()).some(
      (spineItemHighlights) =>
        spineItemHighlights.getHighlightsForTarget(target).length > 0,
    )
  }

  public layout() {
    return forkJoin(
      Array.from(
        this.spineItemHighlightsByItemId.value.values(),
        (spineItemHighlights) => spineItemHighlights.layout(),
      ),
    ).pipe(defaultIfEmpty(null))
  }

  public destroy() {
    super.destroy()

    for (const deregisterHook of this.deregisterHooks) {
      deregisterHook()
    }

    const spineItemHighlightsByItemId = this.spineItemHighlightsByItemId.value

    this.spineItemHighlightsByItemId.next(new Map())
    this.spineItemHighlightsByItemId.complete()

    for (const spineItemHighlights of spineItemHighlightsByItemId.values()) {
      spineItemHighlights.destroy()
    }
  }
}
