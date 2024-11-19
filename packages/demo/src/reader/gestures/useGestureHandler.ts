import { useEffect } from "react"
import { isQuickMenuOpenSignal } from "../states"
import { useReader } from "../useReader"
import { useSubscribe } from "reactjrx"
import { tap, withLatestFrom } from "rxjs"
import { isWithinBookmarkArea } from "../bookmarks/isWithinBookmarkArea"

export const useGestureHandler = () => {
  const { reader } = useReader()

  useEffect(() => {
    const deregister = reader?.gestures.hookManager.register("beforeTap", ({ event }) => {
      const target = event.event.target

      if (isWithinBookmarkArea(target)) {
        return false
      }

      if (target && reader.annotations.isTargetWithinHighlight(target)) {
        return false
      }

      return true
    })

    return () => {
      deregister?.()
    }
  }, [reader])

  /**
   * Subscribe to all unhandled events from gesture manager.
   *
   * These are "app" specific behavior that the enhancer would usually not
   * know about such as triggering the quick menu.
   */
  useSubscribe(() => {
    return reader?.gestures.unhandledEvent$.pipe(
      withLatestFrom(reader.selection.selection$, reader.selection.lastSelectionOnPointerdown$),
      tap(([event, selection, selectionOnPointerdown]) => {
        if (event?.type === "tap") {
          /**
           * Where there is or was a selection before or during the tap, we want to avoid
           * showing the quick menu.
           */
          if (selection || selectionOnPointerdown) {
            isQuickMenuOpenSignal.setValue(false)
          } else {
            isQuickMenuOpenSignal.setValue((val) => !val)
          }
        }
      })
    )
  }, [reader])
}
