import { Box, IconButton, Presence } from "@chakra-ui/react"
import { memo } from "react"
import { createPortal } from "react-dom"
import { BsBookmarkPlus, BsBookmarkXFill } from "react-icons/bs"
import { useObserve } from "reactjrx"
import { hasBookmarksEnhancer, useReader } from "../context/useReader"

export const Bookmarks = memo(() => {
  const reader = useReader()
  const readerWithBookmarks = hasBookmarksEnhancer(reader) ? reader : undefined
  const spineElement = useObserve(() => reader?.spine.element$, [reader])
  const pages = useObserve(
    () => readerWithBookmarks?.bookmarks.pages$,
    [readerWithBookmarks],
  )
  const bookmarks = useObserve(
    () => readerWithBookmarks?.bookmarks.bookmarks$,
    [readerWithBookmarks],
  )
  const consolidatedBookmarks = useObserve(
    () => reader?.locateResource(bookmarks ?? []),
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
              (bookmark) => bookmark?.meta?.absolutePageIndex === index,
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
              <Presence
                key={index}
                present={true}
                lazyMount
                animationName={{ _open: "fade-in", _closed: "fade-out" }}
                animationDuration="moderate"
              >
                <Box
                  data-bookmark-area
                  position="absolute"
                  left={left + width}
                  transform="translateX(-100%)"
                  top={top}
                  p={2}
                >
                  {!bookmarkForPage ? (
                    <IconButton
                      aria-label="bookmark"
                      onClick={() => {
                        readerWithBookmarks?.bookmarks.bookmark(index)
                      }}
                      size="lg"
                      bgColor="white"
                      opacity={0.5}
                      _hover={{ opacity: 1 }}
                      variant="ghost"
                      _icon={{ boxSize: "36px" }}
                    >
                      <BsBookmarkPlus />
                    </IconButton>
                  ) : (
                    <IconButton
                      aria-label="bookmark"
                      opacity={0.5}
                      _hover={{ opacity: 1 }}
                      onClick={() => {
                        bookmarkForPage &&
                          readerWithBookmarks?.bookmarks.delete(
                            bookmarkForPage.resource.id,
                          )
                      }}
                      size="lg"
                      variant="ghost"
                      _icon={{ boxSize: "36px" }}
                    >
                      <BsBookmarkXFill />
                    </IconButton>
                  )}
                </Box>
              </Presence>
            )
          },
        ),
        spineElement,
      )}
    </>
  )
})
