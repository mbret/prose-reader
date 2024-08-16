import { Box } from "@chakra-ui/react"
import { useReader } from "../useReader"
import { useEffect } from "react"
import { useObserve } from "reactjrx"
import { NEVER } from "rxjs"
import { createPortal } from "react-dom"
import React from "react"
import { BookmarkAddButton } from "./BookmarkAddButton"
import { BookmarkRemoveButton } from "./BookmarkRemoveButton"

export const Bookmarks = () => {
  const { reader } = useReader()
  const spineElement = useObserve(() => reader?.spine.element$ ?? NEVER, [reader])
  const pages = useObserve(() => reader?.bookmarks.pages$ ?? NEVER, [reader])
  const bookmarks = useObserve(() => reader?.bookmarks.bookmarks$ ?? NEVER, [reader])

  useEffect(() => {
    spineElement
  }, [spineElement])

  if (!spineElement) return null

  return (
    <>
      {createPortal(
        <>
          {pages?.map(({ absolutePosition: { left, top, width } }, index) => {
            const bookmarkForPage = bookmarks?.find((bookmark) => bookmark.absolutePageIndex === index)

            return (
              <Box data-bookmark-area key={index} position="absolute" left={left + width} transform="translateX(-100%)" top={top}>
                {bookmarkForPage ? (
                  <BookmarkRemoveButton
                    onClick={() => {
                      reader?.bookmarks.removeBookmark({ absolutePageIndex: index })
                    }}
                  />
                ) : (
                  <BookmarkAddButton
                    onClick={() => {
                      reader?.bookmarks.addBookmark({ absolutePageIndex: index })
                    }}
                  />
                )}
              </Box>
            )
          })}
        </>,
        spineElement
      )}
    </>
  )
}
