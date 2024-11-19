import { ReaderInstance } from "../useCreateReader"
import { useObserve, useSubscribe } from "reactjrx"
import { EMPTY, of, skip, tap, withLatestFrom } from "rxjs"
import { isQuickMenuOpenSignal } from "../states"
import { Highlight } from "@prose-reader/enhancer-annotations"
import { selectedHighlightSignal } from "./states"

const restore = (bookKey: string) => {
  const storedData = JSON.parse(localStorage.getItem(`annotations`) || `{}`)
  const restored = storedData[bookKey] || ([] as Highlight[])

  return restored
}

const persist = (bookKey: string, annotations: Highlight[]) => {
  const existing = JSON.parse(localStorage.getItem(`annotations`) || `{}`)

  localStorage.setItem(
    `annotations`,
    JSON.stringify({
      ...existing,
      [bookKey]: annotations
    })
  )
}

export const useAnnotations = (reader: ReaderInstance | undefined, bookKey: string) => {
  /**
   * Restore annotations from local storage
   */
  const isRestored = useObserve(
    () => {
      const restoredAnnotations = restore(bookKey)

      reader?.annotations.add(restoredAnnotations)

      return of(true)
    },
    { defaultValue: false },
    [reader, bookKey]
  )

  /**
   * Persist annotations to local storage
   */
  useSubscribe(
    () =>
      !isRestored
        ? EMPTY
        : reader?.annotations.annotations$.pipe(
            skip(1),
            tap((annotations) => persist(bookKey, annotations))
          ),
    [isRestored, reader, bookKey]
  )

  /**
   * Trigger the highlight menu when user releases its finger
   * after a selection. Discard quick menu if its shown
   */
  useSubscribe(
    () =>
      reader?.selection.selectionAfterPointerUp$.pipe(
        tap(([, selection]) => {
          isQuickMenuOpenSignal.setValue(false)
          selectedHighlightSignal.setValue({ selection })
        })
      ),
    [reader]
  )

  useSubscribe(
    () =>
      reader?.annotations.highlightTap$.pipe(
        tap(({ highlight }) => {
          isQuickMenuOpenSignal.setValue(false)
          selectedHighlightSignal.setValue({ highlight })
        })
      ),
    [reader]
  )
}
