import { isPositionInArea } from "@prose-reader/enhancer-gestures"
import { useEffect } from "react"
import { map, withLatestFrom } from "rxjs"
import { useAnnotations } from "../useAnnotations"
import { useReaderWithAnnotations } from "../useReaderWithAnnotations"

export const useBookmarkOnCornerTap = () => {
  const reader = useReaderWithAnnotations()
  const { data: bookmarks } = useAnnotations()

  useEffect(() => {
    if (!reader) return

    const unSub = reader.gestures.hooks.register(
      "beforeTapGesture",
      ({ event$ }) =>
        event$.pipe(
          withLatestFrom(reader?.annotations.candidates$),
          map(([context, candidates]) => {
            if (!context.page) return true

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

              if (!pageEntry) return true

              const bookmarkForPage = bookmarks?.find(
                (bookmark) =>
                  bookmark?.meta?.absolutePageIndex ===
                    pageEntry.absolutePageIndex &&
                  bookmark.meta.range === undefined,
              )

              if (bookmarkForPage) {
                reader?.annotations.delete(bookmarkForPage.resource.id)

                return false
              }

              const canBookmarkPage = candidates?.[pageEntry.absolutePageIndex]

              if (canBookmarkPage) {
                reader?.annotations.annotateAbsolutePage({
                  absolutePageIndex: pageEntry.absolutePageIndex,
                })

                return false
              }
            }

            return true
          }),
        ),
    )

    return unSub
  }, [reader, bookmarks])
}
