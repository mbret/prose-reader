import { Box } from "@chakra-ui/react"
import { useReader } from "../useReader"
import { useObserve } from "reactjrx"
import { createPortal } from "react-dom"
import { BookmarkAddButton } from "./BookmarkAddButton"
import { BookmarkRemoveButton } from "./BookmarkRemoveButton"

export const Bookmarks = () => {
  const { reader } = useReader()
  const spineElement = useObserve(() => reader?.spine.element$, [reader])
  const pages = useObserve(() => reader?.bookmarks.pages$, [reader])
  const bookmarks = useObserve(() => reader?.bookmarks.bookmarks$, [reader])
  const consolidatedBookmarks = useObserve(
    () => reader?.pagination.locate(bookmarks ?? []),
    [reader, bookmarks],
  )

  if (!spineElement) return null

  return (
    <>
      {createPortal(
        pages?.map(
            (
              { isBookmarkable, absolutePosition: { left, top, width } },
              index,
            ) => {
              const bookmarkForPage = consolidatedBookmarks?.find(
                (bookmark) => bookmark.meta?.absolutePageIndex === index,
              )

              /**
               * Stale bookmarks means we cannot assert at the moment whether the page is marked or not.
               * In this case we just hide the bookmark button. You may want to have different UX to handle
               * this case.
               *
               * This also avoid having a flash where you show an non bookmarked icon and right away change it with
               * a valid marked page icon.
               */
              if (!isBookmarkable) return null

              return (
                <Box
                  data-bookmark-area
                  key={index}
                  position="absolute"
                  left={left + width}
                  transform="translateX(-100%)"
                  top={top}
                >
                  {bookmarkForPage ? (
                    <BookmarkRemoveButton
                      onClick={() => {
                        reader?.bookmarks.delete(bookmarkForPage.id)
                      }}
                    />
                  ) : (
                    <BookmarkAddButton
                      onClick={() => {
                        reader?.bookmarks.bookmark(index)
                      }}
                    />
                  )}
                </Box>
              )
            },
          ),
        spineElement,
      )}
    </>
  )
}
