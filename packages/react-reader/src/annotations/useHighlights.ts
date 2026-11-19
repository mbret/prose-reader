import { useObserve } from "reactjrx"
import { map } from "rxjs"
import { useReaderWithAnnotations } from "./useReaderWithAnnotations.ts"

/** The annotations whose cfi is a range: the highlighted text. */
export const useHighlights = () => {
  const reader = useReaderWithAnnotations()

  return useObserve(
    () =>
      reader?.annotations.annotations$.pipe(
        map((annotations) =>
          annotations.filter(
            (annotation) => reader.cfi.parseCfi(annotation.cfi).isCfiRange,
          ),
        ),
      ),
    [reader],
  )
}
