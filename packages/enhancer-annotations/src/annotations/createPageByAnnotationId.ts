import type { Reader } from "@prose-reader/core"
import {
  distinctUntilChanged,
  map,
  type Observable,
  shareReplay,
  switchMap,
  takeUntil,
} from "rxjs"
import type { Annotation, AnnotationPage } from "../types.ts"

const isSamePageByAnnotationId = (
  previous: ReadonlyMap<string, AnnotationPage>,
  next: ReadonlyMap<string, AnnotationPage>,
) =>
  previous.size === next.size &&
  Array.from(next).every(([annotationId, page]) => {
    const previousPage = previous.get(annotationId)

    return (
      previousPage?.itemIndex === page.itemIndex &&
      previousPage.pageIndex === page.pageIndex
    )
  })

/**
 * `pageByAnnotationId$`, as `AnnotationsEnhancerAPI` documents it. The
 * locator keeps the location of a cfi that a new list still holds, so a list
 * that changes only the selection, color or note of an annotation moves no
 * page.
 */
export const createPageByAnnotationId = (
  reader: Reader,
  annotations$: Observable<Annotation[]>,
): Observable<ReadonlyMap<string, AnnotationPage>> =>
  annotations$.pipe(
    switchMap((annotations) =>
      reader.locateResource(annotations, { mode: "shallow" }),
    ),
    map((locatedAnnotations) => {
      const pageByAnnotationId = new Map<string, AnnotationPage>()

      for (const { resource, meta } of locatedAnnotations) {
        if (meta.itemPageIndex === undefined) {
          pageByAnnotationId.delete(resource.id)
        } else {
          pageByAnnotationId.set(resource.id, {
            itemIndex: meta.itemIndex,
            pageIndex: meta.itemPageIndex,
          })
        }
      }

      return pageByAnnotationId
    }),
    distinctUntilChanged(isSamePageByAnnotationId),
    takeUntil(reader.$.destroy$),
    shareReplay({ refCount: true, bufferSize: 1 }),
  )
