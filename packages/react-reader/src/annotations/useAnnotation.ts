import { isDefined, useObserve } from "reactjrx"
import { filter, map, switchMap } from "rxjs"
import { hasAnnotationsEnhancer, useReader } from "../context/useReader"

export const useAnnotation = (id: string) => {
  const reader = useReader()
  const readerWithAnnotations = hasAnnotationsEnhancer(reader)
    ? reader
    : undefined

  const consolidatedHighlights = useObserve(
    () =>
      readerWithAnnotations?.annotations.annotations$.pipe(
        map((items) => items.find((item) => item.id === id)),
        filter(isDefined),
        switchMap((item) => readerWithAnnotations.locateResource(item)),
      ),
    [readerWithAnnotations],
  )

  return { data: consolidatedHighlights }
}
