import { useEffect } from "react"
import { map, withLatestFrom } from "rxjs"
import { useReaderContext } from "../../context/useReaderContext.ts"
import { useReaderWithAnnotations } from "../useReaderWithAnnotations.ts"
import type { BookmarkIdByItemPage } from "./useBookmarkIdByItemPage.ts"

const CONTINUE_TAP_GESTURE = true
const BOOKMARK_CORNER_SIZE_PERCENT = 10

const isTopRightCornerPosition = ({
  position,
  containerSize,
  sizePercent,
}: {
  position: {
    x: number
    y: number
  }
  containerSize: {
    width: number
    height: number
  }
  sizePercent: number
}) => {
  const actualSize =
    Math.min(containerSize.width, containerSize.height) * (sizePercent / 100)

  return (
    position.x > containerSize.width - actualSize && position.y < actualSize
  )
}

/**
 * A tap on the top right corner of a page removes the page's bookmark, or
 * bookmarks the page.
 */
export const useBookmarkOnCornerTap = (
  bookmarkIdByItemPage: BookmarkIdByItemPage | undefined,
) => {
  const reader = useReaderWithAnnotations()
  const readerContext = useReaderContext()

  useEffect(() => {
    if (!reader) return

    const unSub = reader.gestures.hooks.register(
      "beforeTapGesture",
      ({ event$ }) =>
        event$.pipe(
          withLatestFrom(reader.annotations.candidates$),
          map(([context, candidates]) => {
            if (!context.page) return CONTINUE_TAP_GESTURE

            const {
              spineItem,
              spineItemPageIndex,
              spineItemPagePosition,
              pageSize,
            } = context.page

            const hasTapOnTopRightCorner = isTopRightCornerPosition({
              position: spineItemPagePosition,
              containerSize: pageSize,
              sizePercent: BOOKMARK_CORNER_SIZE_PERCENT,
            })

            // Until the bookmarks are located, a tap cannot tell whether the
            // page has one.
            if (!hasTapOnTopRightCorner || !bookmarkIdByItemPage) {
              return CONTINUE_TAP_GESTURE
            }

            const bookmarkId = bookmarkIdByItemPage
              .get(spineItem.index)
              ?.get(spineItemPageIndex)

            if (bookmarkId !== undefined) {
              readerContext.value.onAnnotationDelete?.(bookmarkId)

              return !CONTINUE_TAP_GESTURE
            }

            const pageEntry = reader.spine.pages.fromSpineItemPageIndex(
              spineItem,
              spineItemPageIndex,
            )

            if (!pageEntry) return CONTINUE_TAP_GESTURE

            const canBookmarkPage = candidates[pageEntry.absolutePageIndex]

            if (canBookmarkPage) {
              const annotation = reader.annotations.createAnnotation({
                absolutePageIndex: pageEntry.absolutePageIndex,
              })

              if (annotation) {
                readerContext.value.onAnnotationCreate?.(annotation)
              }

              return !CONTINUE_TAP_GESTURE
            }

            return CONTINUE_TAP_GESTURE
          }),
        ),
    )

    return unSub
  }, [reader, bookmarkIdByItemPage, readerContext])
}
