import type { BookmarksByItemPage } from "@prose-reader/enhancer-annotations"
import { memo } from "react"
import { useObserve } from "reactjrx"
import { useReader } from "../../context/useReader.ts"
import { BookmarkPageMarker } from "./BookmarkPageMarker.tsx"

export const BookmarkPageMarkers = memo(
  ({
    bookmarksByItemPage,
  }: {
    bookmarksByItemPage: BookmarksByItemPage | undefined
  }) => {
    const reader = useReader()
    const { data: pages } = useObserve(() => reader?.layoutInfo$, [reader])

    return (
      <>
        {pages?.pages.map(
          ({
            absoluteLayout: { left, top, width },
            absolutePageIndex,
            itemIndex,
            pageIndex,
          }) => (
            <BookmarkPageMarker
              key={absolutePageIndex}
              absolutePageIndex={absolutePageIndex}
              isBookmarked={
                !!bookmarksByItemPage?.get(itemIndex)?.has(pageIndex)
              }
              left={left}
              top={top}
              width={width}
            />
          ),
        )}
      </>
    )
  },
)
