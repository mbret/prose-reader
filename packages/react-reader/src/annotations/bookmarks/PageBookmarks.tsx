import { memo } from "react"
import { BookmarkPageMarkers } from "./BookmarkPageMarkers.tsx"
import { useBookmarkIdByItemPage } from "./useBookmarkIdByItemPage.ts"
import { useBookmarkOnCornerTap } from "./useBookmarkOnCornerTap.ts"

/**
 * The markers and the corner tap read the same located bookmarks, so a tap
 * acts on what the markers show.
 */
export const PageBookmarks = memo(() => {
  const { data: bookmarkIdByItemPage } = useBookmarkIdByItemPage()

  useBookmarkOnCornerTap(bookmarkIdByItemPage)

  return <BookmarkPageMarkers bookmarkIdByItemPage={bookmarkIdByItemPage} />
})
