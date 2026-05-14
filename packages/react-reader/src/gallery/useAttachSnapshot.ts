import {
  isShallowEqual,
  observeIntersection,
  type SpineItem,
} from "@prose-reader/core"
import { useCallback } from "react"
import { useSubscribe } from "reactjrx"
import {
  combineLatest,
  distinctUntilChanged,
  map,
  NEVER,
  startWith,
  switchMap,
  throttleTime,
} from "rxjs"
import type { UseMeasureRect } from "../common/useMeasure"
import { hasGalleryEnhancer, useReader } from "../context/useReader"

export const useAttachSnapshot = (
  element: Element | null,
  item: SpineItem,
  measures: UseMeasureRect,
) => {
  const reader = useReader()
  const readerWithGalleryEnhancer = hasGalleryEnhancer(reader)
    ? reader
    : undefined

  const attachSnapshot = useCallback(() => {
    if (!readerWithGalleryEnhancer || !element) return NEVER

    const itemLayoutChanged$ = item.didLayout$.pipe(
      startWith(item.layoutInfo),
      distinctUntilChanged(isShallowEqual),
      throttleTime(100, undefined, { trailing: true }),
    )

    const isItemIntersecting$ = observeIntersection(
      element as HTMLElement,
    ).pipe(
      map((entries) => entries.some((e) => e.isIntersecting)),
      startWith(false),
      distinctUntilChanged(),
    )

    return combineLatest([itemLayoutChanged$, isItemIntersecting$]).pipe(
      switchMap(([, isVisible]) => {
        if (!isVisible) {
          element.innerHTML = ""

          return NEVER
        }

        element.innerHTML = ""

        return readerWithGalleryEnhancer.gallery.snapshot(
          item,
          element,
          measures,
        )
      }),
    )
  }, [readerWithGalleryEnhancer, item, measures, element])

  useSubscribe(attachSnapshot)
}
