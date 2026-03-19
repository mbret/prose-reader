import { memo } from "react"
import { useObserve } from "reactjrx"
import { useReader } from "../../context/useReader"
import { BookmarkPageMarker } from "./BookmarkPageMarker"

export const BookmarkPageMarkers = memo(() => {
  const reader = useReader()
  const { data: pages } = useObserve(() => reader?.layoutInfo$, [reader])

  return (
    <>
      {pages?.pages.map(
        ({ absoluteLayout: { left, top, width } }, pageIndex) => (
          <BookmarkPageMarker
            key={pageIndex}
            absolutePageIndex={pageIndex}
            left={left}
            top={top}
            width={width}
          />
        ),
      )}
    </>
  )
})
