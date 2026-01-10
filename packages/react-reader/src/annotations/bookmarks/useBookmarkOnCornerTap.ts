import { isPositionInArea } from "@prose-reader/enhancer-gestures"
import { useEffect } from "react"
import { map, withLatestFrom } from "rxjs"
import { useReaderContext } from "../../context/useReaderContext"
import { useAnnotations } from "../useAnnotations"
import { useReaderWithAnnotations } from "../useReaderWithAnnotations"

const CONTINUE_TAP_GESTURE = true

export const useBookmarkOnCornerTap = () => {
  const reader = useReaderWithAnnotations()
  const { data: bookmarks } = useAnnotations()
  const readerContext = useReaderContext()

  useEffect(() => {
    if (!reader) return

    const unSub = reader.gestures.hooks.register(
      "beforeTapGesture",
      ({ event$ }) =>
        event$.pipe(
          withLatestFrom(reader?.annotations.candidates$),
          map(([context, candidates]) => {
            if (!context.page) return CONTINUE_TAP_GESTURE

            const {
              spineItem,
              spineItemPageIndex,
              spineItemPagePosition,
              pageSize,
            } = context.page

            const hasTapOnTopRightCorner = isPositionInArea(
              spineItemPagePosition,
              {
                type: "corner",
                corner: "top-right",
                size: 10,
                unit: "%",
              },
              pageSize,
            )

            if (hasTapOnTopRightCorner) {
              const pageEntry = reader.spine.pages.fromSpineItemPageIndex(
                spineItem,
                spineItemPageIndex,
              )

              if (!pageEntry) return CONTINUE_TAP_GESTURE

              const bookmarkForPage = bookmarks?.find(
                (bookmark) =>
                  bookmark?.meta?.absolutePageIndex ===
                    pageEntry.absolutePageIndex &&
                  bookmark.meta.range === undefined,
              )

              if (bookmarkForPage) {
                readerContext.value.onAnnotationDelete?.(
                  bookmarkForPage.resource.id,
                )

                return !CONTINUE_TAP_GESTURE
              }

              const canBookmarkPage = candidates?.[pageEntry.absolutePageIndex]

              if (canBookmarkPage) {
                const annotation = reader?.annotations.createAnnotation({
                  absolutePageIndex: pageEntry.absolutePageIndex,
                })

                if (annotation) {
                  readerContext.value.onAnnotationCreate?.(annotation)
                }

                return !CONTINUE_TAP_GESTURE
              }
            }

            return CONTINUE_TAP_GESTURE
          }),
        ),
    )

    return unSub
  }, [reader, bookmarks, readerContext])
}
