import { memo } from "react"
import { useObserve } from "reactjrx"
import { Spine } from "../../common/Spine"
import { useReader } from "../../context/useReader"
import { BookmarkPageButton } from "./BookmarkPageButton"

export const Bookmarks = memo(() => {
  const reader = useReader()
  const pages = useObserve(() => reader?.layoutInfo$, [reader])

  return (
    <Spine>
      {pages?.pages.map(
        ({ absolutePosition: { left, top, width } }, pageIndex) => (
          <BookmarkPageButton
            key={pageIndex}
            absolutePageIndex={pageIndex}
            left={left}
            top={top}
            width={width}
          />
        ),
      )}
    </Spine>
  )
})
