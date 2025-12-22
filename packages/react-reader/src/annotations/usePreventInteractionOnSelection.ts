import { useSubscribe } from "reactjrx"
import { map, withLatestFrom } from "rxjs"
import { useReaderWithAnnotations } from "./useReaderWithAnnotations"

export const usePreventInteractionOnSelection = () => {
  const reader = useReaderWithAnnotations()

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
}
