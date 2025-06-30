import { Box, Presence } from "@chakra-ui/react"
import { memo } from "react"
import { useSpineItemReady } from "../../common/useSpineItemReady"
import { BOOKMARK_AREA_DATA_ATTRIBUTE } from "../../constants"
import { useAnnotations } from "../useAnnotations"

export const BookmarkPageMarker = memo(
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
    const { isReady: isItemReady } = useSpineItemReady({
      absolutePageIndex,
    })
    const { data: bookmarks } = useAnnotations()
    const bookmarkForPage = bookmarks?.find(
      (bookmark) =>
        bookmark?.meta?.absolutePageIndex === absolutePageIndex &&
        bookmark.meta.range === undefined,
    )

    /**
     * Stale bookmarks means we cannot assert at the moment whether the page is marked or not.
     * In this case we just hide the bookmark button. You may want to have different UX to handle
     * this case.
     *
     * This also avoid having a flash where you show an non bookmarked icon and right away change it with
     * a valid marked page icon.
     */
    if (!isItemReady) return null

    const markerSize = (width * 0.1) / 2

    return (
      <Presence
        present={!!bookmarkForPage}
        lazyMount
        animationName={{ _open: "fade-in", _closed: "fade-out" }}
        animationDuration="moderate"
      >
        <Box
          data-bookmark-area={BOOKMARK_AREA_DATA_ATTRIBUTE}
          position="absolute"
          left={left + width}
          transform="translateX(-100%)"
          pointerEvents="none"
          top={top}
          width={markerSize}
          height={markerSize}
          _before={{
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            width: 0,
            height: 0,
            borderTop: `${markerSize}px solid #03030373`,
            borderLeft: `${markerSize}px solid transparent`,
          }}
        />
      </Presence>
    )
  },
)
