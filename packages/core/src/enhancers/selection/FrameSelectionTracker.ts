import {
  delay,
  endWith,
  filter,
  first,
  merge,
  NEVER,
  Observable,
  of,
  switchMap,
  takeUntil,
} from "rxjs"
import { fromEvent, map } from "rxjs"
import { DestroyableClass } from "../../utils/DestroyableClass"
import { isDefined } from "../../utils/isDefined"
import { observeMutation } from "../../utils/rxjs"

export class FrameSelectionTracker extends DestroyableClass {
  selectionChange$: Observable<Selection | null>
  selectionOver$: Observable<readonly [Event, Selection]>

  constructor(frame: HTMLIFrameElement) {
    super()

    const frameDoc = frame.contentDocument || frame.contentWindow?.document

    if (!frameDoc) {
      this.selectionChange$ = NEVER
      this.selectionOver$ = NEVER
    } else {
      /**
       * We observe mutation on the doc to intercept potential
       * change in selection that would not be triggered by API.
       * Such as iframe nodes being recreated on layout.
       */
      const frameDocMutation$ = observeMutation(frameDoc.body, {
        childList: true,
        subtree: true,
      }).pipe(
        filter(
          (mutations) =>
            !!mutations.find((mutation) => {
              return (
                mutation.type === "childList" && mutation.removedNodes.length
              )
            }),
        ),
      )

      /**
       * We observe direct destruction of the iframe as well to remove current
       * selection if needed.
       */
      const iframeDestroyed$ = !frame.parentElement
        ? of(null)
        : observeMutation(frame.parentElement, {
            childList: true,
          }).pipe(
            filter(
              (mutation) =>
                !!mutation.find((mutation) =>
                  Array.from(mutation.removedNodes).includes(frame),
                ),
            ),
          )

      this.selectionChange$ = merge(
        fromEvent(frameDoc, "selectionchange"),
        frameDocMutation$,
      ).pipe(
        map(() => frameDoc.getSelection()),
        takeUntil(merge(iframeDestroyed$, this.destroy$)),
        endWith(null),
      )

      this.selectionOver$ = fromEvent(frameDoc, "pointerdown").pipe(
        switchMap(() =>
          merge(
            fromEvent(frameDoc, "pointerup"),
            fromEvent(frameDoc, "pointercancel"),
            fromEvent(frameDoc, "contextmenu"),
          ).pipe(
            first(),
            /**
             * The selection is still valid during the event even if it will
             * be discarded. The timeout make sure to detect this edge case.
             */
            delay(0),
            map((event) => {
              const selection = frameDoc.getSelection()

              return selection && !selection.isCollapsed
                ? ([event, selection] as const)
                : undefined
            }),
            filter(isDefined),
          ),
        ),
        takeUntil(merge(iframeDestroyed$, this.destroy$)),
      )
    }
  }
}
