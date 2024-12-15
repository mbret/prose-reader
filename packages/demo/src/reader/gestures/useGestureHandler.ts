import { isQuickMenuOpenSignal } from "../states"
import { useReader } from "../useReader"
import { useSubscribe } from "reactjrx"
import { filter, map, tap, withLatestFrom } from "rxjs"

export const useGestureHandler = () => {
  const { reader } = useReader()

  useSubscribe(
    () =>
      reader?.gestures.hookManager.register("beforeTap", ({ event }) => {
        const target = event.event.target

        return reader.selection.lastSelectionOnPointerdown$.pipe(
          map((lastSelectionOnPointerdown) => {
            const wasOrIsOnSelection =
              (target && reader.annotations.isTargetWithinHighlight(target)) || lastSelectionOnPointerdown

            return !wasOrIsOnSelection
          })
        )
      }),
    [reader]
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
      withLatestFrom(reader.selection.selection$, reader.selection.lastSelectionOnPointerdown$),
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
      })
    )
  }, [reader])
}
