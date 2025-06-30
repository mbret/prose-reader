import { useSubscribe } from "reactjrx"
import { filter, map, tap, withLatestFrom } from "rxjs"
import { isQuickMenuOpenSignal } from "../states"
import { useReader } from "../useReader"

export const useGestureHandler = () => {
  const { reader } = useReader()

  useSubscribe(
    () =>
      /**
       * Hook used to prevent some gestures from being handled.
       */
      reader?.gestures.hooks.register("beforeTapGesture", ({ event$ }) =>
        event$.pipe(
          withLatestFrom(reader.selection.lastSelectionOnPointerdown$),
          map(([{ event }, lastSelectionOnPointerdown]) => {
            const target = event.event.target

            /**
             * In this case if we have a gesture on an annotation, we want to prevent
             * it.
             */
            const wasOrIsOnSelection =
              (target && reader.annotations.isTargetWithinHighlight(target)) ||
              lastSelectionOnPointerdown

            return !wasOrIsOnSelection
          }),
        ),
      ),
    [reader],
  )

  /**
   * Subscribe to all unhandled events from gesture manager.
   *
   * These are "app" specific behavior that the enhancer would usually not
   * know about such as triggering the quick menu.
   */
  useSubscribe(() => {
    return reader?.gestures.gestures$.pipe(
      filter(({ handled, event }) => !handled && event?.type === "tap"),
      withLatestFrom(
        reader.selection.selection$,
        reader.selection.lastSelectionOnPointerdown$,
      ),
      tap(([, selection, selectionOnPointerdown]) => {
        /**
         * Where there is or was a selection before or during the tap, we want to avoid
         * showing the quick menu.
         */
        if (selection || selectionOnPointerdown) {
          isQuickMenuOpenSignal.setValue(false)
        } else {
          isQuickMenuOpenSignal.setValue((val) => !val)
        }
      }),
    )
  }, [reader])
}
