import { useObserve } from "reactjrx"
import { map } from "rxjs"
import { useReaderWithAnnotations } from "../useReaderWithAnnotations.ts"

export const useBookmarks = () => {
  const reader = useReaderWithAnnotations()

  return useObserve(
    () =>
      reader?.annotations.annotations$.pipe(
        map((annotations) =>
          annotations.filter(
            (annotation) =>
              !reader.cfi.parseCfi(annotation.cfi).isCfiRange &&
              !annotation.notes,
          ),
        ),
      ),
    [reader],
  )
}
