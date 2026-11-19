import type { RuntimeAnnotation } from "@prose-reader/enhancer-annotations"
import { useObserve } from "reactjrx"
import { map } from "rxjs"
import { isBookmark } from "./isBookmark.ts"
import { useReaderWithAnnotations } from "./useReaderWithAnnotations.ts"

/**
 * The annotations split between the two tabs of the Annotations dialog: each
 * one is in `bookmarks` or in `highlights`, never in both.
 */
export const useAnnotationsByKind = () => {
  const reader = useReaderWithAnnotations()

  return useObserve(
    () =>
      reader?.annotations.annotations$.pipe(
        map((annotations) => {
          const bookmarks: RuntimeAnnotation[] = []
          const highlights: RuntimeAnnotation[] = []

          for (const annotation of annotations) {
            if (isBookmark(reader, annotation)) {
              bookmarks.push(annotation)
            } else {
              highlights.push(annotation)
            }
          }

          return { bookmarks, highlights }
        }),
      ),
    [reader],
  )
}
