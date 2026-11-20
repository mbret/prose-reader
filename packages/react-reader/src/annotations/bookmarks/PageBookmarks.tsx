import { memo } from "react"
import { useObserve } from "reactjrx"
import { useReaderWithAnnotations } from "../useReaderWithAnnotations.ts"
import { BookmarkPageMarkers } from "./BookmarkPageMarkers.tsx"
import { useBookmarkOnCornerTap } from "./useBookmarkOnCornerTap.ts"

/**
 * The markers and the corner tap read the same bookmarks, so a tap acts on
 * what the markers show.
 */
export const PageBookmarks = memo(() => {
  const reader = useReaderWithAnnotations()
  const { data: bookmarksByItemPage } = useObserve(
    () => reader?.annotations.bookmarksByItemPage$,
    [reader],
  )

  useBookmarkOnCornerTap(bookmarksByItemPage)

  return <BookmarkPageMarkers bookmarksByItemPage={bookmarksByItemPage} />
})
