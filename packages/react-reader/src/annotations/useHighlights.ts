import { useObserve } from "reactjrx"
import { map } from "rxjs"
import { isBookmark } from "./bookmarks/isBookmark.ts"
import { useReaderWithAnnotations } from "./useReaderWithAnnotations.ts"

export const useHighlights = () => {
  const reader = useReaderWithAnnotations()

  return useObserve(
    () =>
      reader?.annotations.annotations$.pipe(
        map((annotations) =>
          annotations.filter((annotation) => !isBookmark(reader, annotation)),
        ),
      ),
    [reader],
  )
}
