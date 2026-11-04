import { useCallback } from "react"
import { useSubscribe } from "reactjrx"
import { filter, tap, withLatestFrom } from "rxjs"
import { useReaderViewContext } from "../context/ReaderViewContext"
import { useReader } from "../context/useReader"

export const useQuickMenuToggleGesture = () => {
  const { onQuickMenuOpenChange } = useReaderViewContext()
  const reader = useReader()

  /**
   * Subscribe to all unhandled events from gesture manager.
   *
   * These are "app" specific behavior that the enhancer would usually not
   * know about such as triggering the quick menu.
   */
  const quickMenuToggleGesture = useCallback(() => {
    return reader?.gestures.gestures$.pipe(
      filter((event) => event.type === "tap" && !event.handled),
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
          onQuickMenuOpenChange(false)
        } else {
          onQuickMenuOpenChange((val) => !val)
        }
      }),
    )
  }, [reader, onQuickMenuOpenChange])

  useSubscribe(quickMenuToggleGesture)
}
