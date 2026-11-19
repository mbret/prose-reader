import { memo } from "react"
import { useObserve } from "reactjrx"
import { useReader } from "../../context/useReader.ts"
import { BookmarkPageMarker } from "./BookmarkPageMarker.tsx"

export const BookmarkPageMarkers = memo(
  ({
    bookmarkedAbsolutePageIndexes,
  }: {
    bookmarkedAbsolutePageIndexes: ReadonlySet<number>
  }) => {
    const reader = useReader()
    const { data: pages } = useObserve(() => reader?.layoutInfo$, [reader])

    return (
      <>
        {pages?.pages.map(
          ({ absoluteLayout: { left, top, width } }, pageIndex) => (
            <BookmarkPageMarker
              key={pageIndex}
              absolutePageIndex={pageIndex}
              isBookmarked={bookmarkedAbsolutePageIndexes.has(pageIndex)}
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
