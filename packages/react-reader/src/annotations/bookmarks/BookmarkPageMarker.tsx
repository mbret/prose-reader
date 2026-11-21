import { Box, Presence } from "@chakra-ui/react"
import { memo } from "react"
import { useSpineItemReady } from "../../common/useSpineItemReady.ts"
import { BOOKMARK_AREA_DATA_ATTRIBUTE } from "../../constants.ts"

export const BookmarkPageMarker = memo(
  ({
    absolutePageIndex,
    isBookmarked,
    left,
    top,
    width,
  }: {
    absolutePageIndex: number
    isBookmarked: boolean
    left: number
    top: number
    width: number
  }) => {
    const { isReady: isItemReady } = useSpineItemReady({
      absolutePageIndex,
    })

    /**
     * While its item is not ready, the page shows no content, and a bookmark
     * located on it may date from before its item unloaded: whether the page
     * is marked cannot be asserted, so the marker hides.
     */
    if (!isItemReady) return null

    const markerSize = (width * 0.1) / 2

    return (
      <Presence
        present={isBookmarked}
        lazyMount
        animationName={{ _open: "fade-in", _closed: "fade-out" }}
        animationDuration="moderate"
      >
        <Box
          role="img"
          aria-label="Bookmarked page"
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
