import { useObserve } from "reactjrx"
import { map } from "rxjs"
import { useReaderWithAnnotations } from "../useReaderWithAnnotations.ts"
import { isBookmark } from "./isBookmark.ts"

export const useBookmarks = () => {
  const reader = useReaderWithAnnotations()

  return useObserve(
    () =>
      reader?.annotations.annotations$.pipe(
        map((annotations) =>
          annotations.filter((annotation) => isBookmark(reader, annotation)),
        ),
      ),
    [reader],
  )
}
