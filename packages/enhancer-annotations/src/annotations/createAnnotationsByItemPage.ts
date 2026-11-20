import type { Reader } from "@prose-reader/core"
import { isShallowEqual } from "@prose-reader/shared"
import {
  distinctUntilChanged,
  map,
  type Observable,
  shareReplay,
  switchMap,
  takeUntil,
} from "rxjs"
import type { AnnotationsByItemPage } from "../types.ts"
import type { RuntimeAnnotation } from "./types.ts"

const isSameAnnotationList = (
  previous: RuntimeAnnotation[],
  next: RuntimeAnnotation[],
) =>
  previous.length === next.length &&
  previous.every((annotation, index) => isShallowEqual(annotation, next[index]))

const isSameAnnotationsByItemPage = (
  previous: AnnotationsByItemPage,
  next: AnnotationsByItemPage,
) =>
  previous.size === next.size &&
  Array.from(next).every(([itemIndex, annotationsByPage]) => {
    const previousAnnotationsByPage = previous.get(itemIndex)

    return (
      previousAnnotationsByPage?.size === annotationsByPage.size &&
      Array.from(annotationsByPage).every(([pageIndex, annotations]) => {
        const previousAnnotations = previousAnnotationsByPage.get(pageIndex)

        return (
          previousAnnotations?.length === annotations.length &&
          annotations.every((annotation, index) =>
            isShallowEqual(annotation, previousAnnotations[index]),
          )
        )
      })
    )
  })

/**
 * `annotationsByItemPage$`, as `AnnotationsEnhancerAPI` documents it. A list
 * in which no annotation changed, as when an app emits equal objects again,
 * locates nothing.
 */
export const createAnnotationsByItemPage$ = (
  reader: Reader,
  annotations$: Observable<RuntimeAnnotation[]>,
): Observable<AnnotationsByItemPage> =>
  annotations$.pipe(
    distinctUntilChanged(isSameAnnotationList),
    switchMap((annotations) =>
      reader.locateResource(annotations, { mode: "shallow" }),
    ),
    map((locatedAnnotations) => {
      const annotationsByItemPage = new Map<
        number,
        Map<number, RuntimeAnnotation[]>
      >()

      for (const { resource, meta } of locatedAnnotations) {
        if (meta.itemPageIndex === undefined) continue

        let annotationsByPage = annotationsByItemPage.get(meta.itemIndex)

        if (!annotationsByPage) {
          annotationsByPage = new Map()
          annotationsByItemPage.set(meta.itemIndex, annotationsByPage)
        }

        const annotationsOfPage = annotationsByPage.get(meta.itemPageIndex)

        if (annotationsOfPage) {
          annotationsOfPage.push(resource)
        } else {
          annotationsByPage.set(meta.itemPageIndex, [resource])
        }
      }

      return annotationsByItemPage
    }),
    // A relocation that moves no annotation emits nothing.
    distinctUntilChanged(isSameAnnotationsByItemPage),
    takeUntil(reader.$.destroy$),
    shareReplay({ refCount: true, bufferSize: 1 }),
  )
