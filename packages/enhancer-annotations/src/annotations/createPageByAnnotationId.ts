import type { PageEntry, Reader } from "@prose-reader/core"
import {
  combineLatest,
  distinctUntilChanged,
  map,
  merge,
  type Observable,
  shareReplay,
  skip,
  startWith,
  takeUntil,
} from "rxjs"
import type { Annotation } from "../types.ts"

type AnnotationPage = Pick<PageEntry, "itemIndex" | "pageIndex">

const isSameIdAndCfiList = (
  previous: Pick<Annotation, "id" | "cfi">[],
  next: Pick<Annotation, "id" | "cfi">[],
) =>
  previous.length === next.length &&
  previous.every(
    (annotation, index) =>
      annotation.id === next[index]?.id && annotation.cfi === next[index]?.cfi,
  )

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
 * `pageByAnnotationId$`, as `AnnotationsEnhancerAPI` documents it. Only an
 * annotation's id and cfi decide its page, so the list is reduced to them
 * before anything is looked up.
 *
 * The pages are found again when a layout pass completes, and when an item
 * becomes ready or stops being ready. An item that unloads loses its pages at
 * once, as with `locateResource()`, even while no layout can complete.
 */
export const createPageByAnnotationId = (
  reader: Reader,
  annotations$: Observable<Annotation[]>,
): Observable<ReadonlyMap<string, AnnotationPage>> => {
  const idsAndCfis$ = annotations$.pipe(
    map((annotations) => annotations.map(({ id, cfi }) => ({ id, cfi }))),
    distinctUntilChanged(isSameIdAndCfiList),
  )

  const pagesMayHaveChanged$ = merge(
    reader.spine.layout$,
    ...reader.spineItemsManager.items.map((spineItem) =>
      spineItem.isReady$.pipe(skip(1)),
    ),
  )

  return combineLatest([
    idsAndCfis$,
    pagesMayHaveChanged$.pipe(startWith(null)),
  ]).pipe(
    map(([idsAndCfis]) => {
      const pageByAnnotationId = new Map<string, AnnotationPage>()

      for (const { id, cfi } of idsAndCfis) {
        const spineItem = reader.cfi.getSpineItemFromCfi(cfi)
        const pageIndex = reader.cfi.getSpineItemPageIndexFromCfi(cfi)

        if (spineItem && pageIndex !== undefined) {
          pageByAnnotationId.set(id, { itemIndex: spineItem.index, pageIndex })
        } else {
          pageByAnnotationId.delete(id)
        }
      }

      return pageByAnnotationId
    }),
    distinctUntilChanged(isSamePageByAnnotationId),
    takeUntil(reader.$.destroy$),
    shareReplay({ refCount: true, bufferSize: 1 }),
  )
}
