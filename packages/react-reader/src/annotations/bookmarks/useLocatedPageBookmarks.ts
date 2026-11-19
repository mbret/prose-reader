import type { ConsolidatedResource } from "@prose-reader/core"
import type { RuntimeAnnotation } from "@prose-reader/enhancer-annotations"
import { useObserve } from "reactjrx"
import { map, switchMap } from "rxjs"
import { useReaderWithAnnotations } from "../useReaderWithAnnotations.ts"

export type LocatedPageBookmark = {
  resource: RuntimeAnnotation
  meta: ConsolidatedResource
}

/**
 * The bookmarks of pages, the annotations whose cfi is not a range, each with
 * the page it is on. They are located without loading any chapter, so a
 * bookmark of a reflowable chapter has a page only while its chapter is
 * loaded: that is when the reader can show the page.
 */
export const useLocatedPageBookmarks = () => {
  const reader = useReaderWithAnnotations()

  return useObserve(
    () =>
      reader?.annotations.annotations$.pipe(
        map((annotations) =>
          annotations.filter(
            (annotation) => !reader.cfi.parseCfi(annotation.cfi).isCfiRange,
          ),
        ),
        switchMap((pageBookmarks) =>
          reader.locateResource(pageBookmarks, { mode: "shallow" }),
        ),
      ),
    [reader],
  )
}
