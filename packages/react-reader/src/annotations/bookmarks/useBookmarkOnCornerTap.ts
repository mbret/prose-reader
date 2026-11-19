import { useEffect } from "react"
import { map, withLatestFrom } from "rxjs"
import { useReaderContext } from "../../context/useReaderContext.ts"
import { useReaderWithAnnotations } from "../useReaderWithAnnotations.ts"
import type { LocatedPageBookmark } from "./useLocatedPageBookmarks.ts"

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
 * bookmarks the page. `locatedPageBookmarks` are the bookmarks of pages, each
 * with the page it is on.
 */
export const useBookmarkOnCornerTap = (
  locatedPageBookmarks: LocatedPageBookmark[] | undefined,
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

            if (!hasTapOnTopRightCorner) return CONTINUE_TAP_GESTURE

            const pageEntry = reader.spine.pages.fromSpineItemPageIndex(
              spineItem,
              spineItemPageIndex,
            )

            if (!pageEntry) return CONTINUE_TAP_GESTURE

            const bookmarkForPage = locatedPageBookmarks?.find(
              ({ meta }) =>
                meta.absolutePageIndex === pageEntry.absolutePageIndex,
            )

            if (bookmarkForPage) {
              readerContext.value.onAnnotationDelete?.(
                bookmarkForPage.resource.id,
              )

              return !CONTINUE_TAP_GESTURE
            }

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
  }, [reader, locatedPageBookmarks, readerContext])
}
