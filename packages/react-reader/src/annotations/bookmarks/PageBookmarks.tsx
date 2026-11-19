import { memo, useMemo } from "react"
import { BookmarkPageMarkers } from "./BookmarkPageMarkers.tsx"
import { useBookmarkOnCornerTap } from "./useBookmarkOnCornerTap.ts"
import { useLocatedPageBookmarks } from "./useLocatedPageBookmarks.ts"

/**
 * The bookmarks of pages: a marker on each bookmarked page, and a tap on the
 * top right corner of a page to bookmark it or remove its bookmark. The
 * markers and the tap read the same located bookmarks, so a tap acts on what
 * the markers show.
 */
export const PageBookmarks = memo(() => {
  const { data: locatedPageBookmarks } = useLocatedPageBookmarks()
  const bookmarkedAbsolutePageIndexes = useMemo(
    () =>
      new Set(
        locatedPageBookmarks?.flatMap(({ meta: { absolutePageIndex } }) =>
          absolutePageIndex === undefined ? [] : [absolutePageIndex],
        ),
      ),
    [locatedPageBookmarks],
  )

  useBookmarkOnCornerTap(locatedPageBookmarks)

  return (
    <BookmarkPageMarkers
      bookmarkedAbsolutePageIndexes={bookmarkedAbsolutePageIndexes}
    />
  )
})
