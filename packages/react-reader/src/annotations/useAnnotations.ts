import { useObserve } from "reactjrx"
import { switchMap } from "rxjs"
import { hasAnnotationsEnhancer, useReader } from "../context/useReader"

export const useAnnotations = () => {
  const reader = useReader()
  const readerWithAnnotations = hasAnnotationsEnhancer(reader)
    ? reader
    : undefined

  const consolidatedHighlights = useObserve(
    () =>
      readerWithAnnotations?.annotations.annotations$.pipe(
        switchMap((highlights) => {
          return readerWithAnnotations.locateResource(highlights)
        }),
      ),
    [readerWithAnnotations],
  )

  return { data: consolidatedHighlights }
}
