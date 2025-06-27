import { Box, IconButton, Presence } from "@chakra-ui/react"
import { memo } from "react"
import { BsBookmarkPlus, BsBookmarkXFill } from "react-icons/bs"
import { useSpineItemReady } from "../../common/useSpineItemReady"
import { BOOKMARK_AREA_DATA_ATTRIBUTE } from "../../constants"
import { useAnnotations } from "../useAnnotations"
import { useReaderWithAnnotations } from "../useReaderWithAnnotations"
import { useCanBookmarkPage } from "./useCanBookmarkPage"

export const BookmarkPageButton = memo(
  ({
    absolutePageIndex,
    left,
    top,
    width,
  }: {
    absolutePageIndex: number
    left: number
    top: number
    width: number
  }) => {
    const reader = useReaderWithAnnotations()
    const isItemReady = useSpineItemReady({ absolutePageIndex })
    const { data: bookmarks } = useAnnotations()
    const bookmarkForPage = bookmarks?.find(
      (bookmark) =>
        bookmark?.meta?.absolutePageIndex === absolutePageIndex &&
        bookmark.meta.range === undefined,
    )
    const canBookmarkPage = useCanBookmarkPage(absolutePageIndex)

    /**
     * Stale bookmarks means we cannot assert at the moment whether the page is marked or not.
     * In this case we just hide the bookmark button. You may want to have different UX to handle
     * this case.
     *
     * This also avoid having a flash where you show an non bookmarked icon and right away change it with
     * a valid marked page icon.
     */
    if (!isItemReady || !canBookmarkPage) return null

    return (
      <Presence
        present={true}
        lazyMount
        animationName={{ _open: "fade-in", _closed: "fade-out" }}
        animationDuration="moderate"
      >
        <Box
          data-bookmark-area={BOOKMARK_AREA_DATA_ATTRIBUTE}
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
                reader?.annotations.annotateAbsolutePage({
                  absolutePageIndex,
                })
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
                reader?.annotations.delete(bookmarkForPage.resource.id)
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
)
