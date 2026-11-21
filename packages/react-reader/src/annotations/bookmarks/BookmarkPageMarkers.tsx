import { memo } from "react"
import { useObserve } from "reactjrx"
import { useReader } from "../../context/useReader.ts"
import { BookmarkPageMarker } from "./BookmarkPageMarker.tsx"
import type { BookmarkIdByItemPage } from "./useBookmarkIdByItemPage.ts"

export const BookmarkPageMarkers = memo(
  ({
    bookmarkIdByItemPage,
  }: {
    bookmarkIdByItemPage: BookmarkIdByItemPage | undefined
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
                !!bookmarkIdByItemPage?.get(itemIndex)?.has(pageIndex)
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
