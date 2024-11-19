import { delay, filter, Observable } from "rxjs"
import { fromEvent, map } from "rxjs"
import { DestroyableClass } from "../../utils/DestroyableClass"
import { isDefined } from "../../utils/isDefined"

export class SelectionTracker extends DestroyableClass {
  selectionChange$: Observable<Selection | null>
  selectionAfterPointerUp$: Observable<readonly [Event, Selection]>

  constructor(document: Document) {
    super()

    this.selectionChange$ = fromEvent(document, "selectionchange").pipe(
      map(() => document.getSelection()),
    )

    this.selectionAfterPointerUp$ = fromEvent(document, "pointerup").pipe(
      /**
       * The selection is still valid during the event even if it will
       * be discarded. The timeout make sure to detect this edge case.
       */
      delay(0),
      map((event) => {
        const selection = document.getSelection()

        return selection && !selection.isCollapsed
          ? ([event, selection] as const)
          : undefined
      }),
      filter(isDefined),
    )
  }
}
