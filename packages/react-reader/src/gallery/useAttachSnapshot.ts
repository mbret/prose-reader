import {
  isShallowEqual,
  observeIntersection,
  type SpineItem,
} from "@prose-reader/core"
import { useSubscribe } from "reactjrx"
import {
  distinctUntilChanged,
  filter,
  first,
  map,
  NEVER,
  startWith,
  switchMap,
  tap,
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

  useSubscribe(() => {
    if (!readerWithGalleryEnhancer || !element) return NEVER

    const itemLayoutChanged$ = item.didLayout$.pipe(
      startWith(item.layoutInfo),
      distinctUntilChanged(isShallowEqual),
    )

    const isItemIntersecting$ = observeIntersection(
      element as HTMLElement,
    ).pipe(map((entries) => entries.some((e) => e.isIntersecting)))

    return itemLayoutChanged$.pipe(
      throttleTime(100, undefined, { trailing: true }),
      switchMap(() => {
        return isItemIntersecting$
          .pipe(
            tap((isVisible) => {
              // if the layout change and the item is not visible anymore, cleanup the element
              if (!isVisible) {
                element.innerHTML = ""
              }
            }),
            filter((isVisible) => isVisible),
            first(),
          )
          .pipe(
            switchMap(() => {
              element.innerHTML = ""

              return readerWithGalleryEnhancer?.gallery.snapshot(
                item,
                element,
                measures,
              )
            }),
          )
      }),
    )
  }, [readerWithGalleryEnhancer, item, measures, element])
}
