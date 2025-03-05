import { distinctUntilChanged, switchMap, tap } from "rxjs"

import { map } from "rxjs"

import { NEVER } from "rxjs"

import { type SpineItem, isShallowEqual } from "@prose-reader/core"
import { useSubscribe } from "reactjrx"
import { filter } from "rxjs"
import type { UseMeasureRect } from "../common/useMeasure"
import { useReader } from "../context/useReader"
import { hasGalleryEnhancer } from "../context/useReader"

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

    const itemReadyAndLayoutChanged$ = item.isReady$.pipe(
      filter((isReady) => isReady),
      map(() => item.layout.layoutInfo),
      distinctUntilChanged(isShallowEqual),
    )

    return itemReadyAndLayoutChanged$.pipe(
      switchMap(() =>
        readerWithGalleryEnhancer?.gallery.snapshot(item, measures),
      ),
      tap((snapshot) => {
        element.innerHTML = ""
        element.appendChild(snapshot)
      }),
    )
  }, [readerWithGalleryEnhancer, item, measures, element])
}
