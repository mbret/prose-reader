import { Box, Collapsible, HStack, IconButton, Stack } from "@chakra-ui/react"
import { memo, useState } from "react"
import { BsBookmarks } from "react-icons/bs"
import {
  LuChevronDown,
  LuCircleHelp,
  LuGalleryHorizontal,
  LuNotebookPen,
  LuSearch,
  LuTableOfContents,
} from "react-icons/lu"
import { MdOutlineFitScreen } from "react-icons/md"
import { RiGalleryView2 } from "react-icons/ri"
import {
  RxDoubleArrowDown,
  RxDoubleArrowLeft,
  RxDoubleArrowRight,
  RxDoubleArrowUp,
} from "react-icons/rx"
import { useObserve } from "reactjrx"
import {
  hasAnnotationsEnhancer,
  hasGalleryEnhancer,
  hasRefitEnhancer,
  hasSearchEnhancer,
  useReader,
} from "../context/useReader"
import { useReaderContext } from "../context/useReaderContext"
import { PaginationInfoSection } from "./PaginationInfoSection"
import { QuickBar } from "./QuickBar"
import { Scrubber } from "./Scrubber"

export const BottomBar = memo(
  ({
    open,
    onItemClick,
  }: {
    open: boolean
    onItemClick: (
      item: "annotations" | "search" | "help" | "toc" | "bookmarks" | "gallery",
    ) => void
  }) => {
    const reader = useReader()
    const { refitMenuSignal } = useReaderContext()
    const navigation = useObserve(() => reader?.navigation.state$, [reader])
    const settings = useObserve(() => reader?.settings.values$, [reader])
    const zoomState = useObserve(() => reader?.zoom.state$, [reader])
    const isScrollingMode = settings?.computedPageTurnMode === "scrollable"
    const isVerticalDirection =
      settings?.computedPageTurnDirection === "vertical"
    const [isExtraOpen, setIsExtraOpen] = useState(true)

    return (
      <QuickBar
        present={open}
        position="bottom"
        display="flex"
        flexDirection="column"
        overflow="auto"
        pb={8}
        px={0}
      >
        <HStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          maxWidth="100%"
          px={4}
        >
          <IconButton
            aria-label="left"
            size="lg"
            variant="ghost"
            flexShrink={0}
            onClick={() => reader?.navigation.goToLeftOrTopSpineItem()}
            disabled={
              !navigation?.canGoLeftSpineItem && !navigation?.canGoTopSpineItem
            }
          >
            {isVerticalDirection ? <RxDoubleArrowUp /> : <RxDoubleArrowLeft />}
          </IconButton>
          <Stack
            flex={1}
            maxW={400}
            gap={2}
            alignItems="center"
            overflow="auto"
            px={4}
          >
            <PaginationInfoSection />
            <Scrubber
              style={{
                width: "100%",
                maxWidth: "300px",
                height: "35px",
              }}
            />
          </Stack>
          <IconButton
            aria-label="right"
            size="lg"
            flexShrink={0}
            variant="ghost"
            disabled={
              !navigation?.canGoRightSpineItem &&
              !navigation?.canGoBottomSpineItem
            }
            onClick={() => {
              reader?.navigation.goToRightOrBottomSpineItem()
            }}
          >
            {isVerticalDirection ? (
              <RxDoubleArrowDown />
            ) : (
              <RxDoubleArrowRight />
            )}
          </IconButton>
        </HStack>
        <HStack alignSelf="stretch" alignItems="center" justifyContent="center">
          <Collapsible.Root
            open={isExtraOpen}
            flex={1}
            onOpenChange={({ open }) => {
              setIsExtraOpen(open)
            }}
            width="100%"
          >
            <Collapsible.Trigger
              paddingY="3"
              width="100%"
              display="flex"
              justifyContent="center"
            >
              <LuChevronDown
                style={{
                  transform: isExtraOpen ? "rotate(0deg)" : "rotate(180deg)",
                }}
              />
            </Collapsible.Trigger>
            <Collapsible.Content display="flex" justifyContent="center">
              <Box display="flex" overflowX="auto" px={4} pb={1}>
                <IconButton
                  aria-label="Help"
                  size="lg"
                  variant="ghost"
                  onClick={() => onItemClick("help")}
                >
                  <LuCircleHelp />
                </IconButton>
                <IconButton
                  aria-label="Table of contents"
                  size="lg"
                  variant="ghost"
                  onClick={() => onItemClick("toc")}
                >
                  <LuTableOfContents />
                </IconButton>
                {hasSearchEnhancer(reader) && (
                  <IconButton
                    aria-label="Search"
                    size="lg"
                    variant="ghost"
                    onClick={() => onItemClick("search")}
                  >
                    <LuSearch />
                  </IconButton>
                )}
                {hasAnnotationsEnhancer(reader) && (
                  <IconButton
                    aria-label="Bookmarks"
                    size="lg"
                    variant="ghost"
                    onClick={() => onItemClick("bookmarks")}
                  >
                    <BsBookmarks />
                  </IconButton>
                )}
                {hasAnnotationsEnhancer(reader) && (
                  <IconButton
                    aria-label="Annotations"
                    size="lg"
                    variant="ghost"
                    onClick={() => onItemClick("annotations")}
                  >
                    <LuNotebookPen />
                  </IconButton>
                )}
                {hasRefitEnhancer(reader) && (
                  <IconButton
                    aria-label="Refit"
                    size="lg"
                    variant="ghost"
                    onClick={() => {
                      refitMenuSignal.next(true)
                    }}
                    disabled={!isScrollingMode}
                  >
                    <MdOutlineFitScreen />
                  </IconButton>
                )}
                <IconButton
                  aria-label="Thumbnails"
                  size="lg"
                  variant={
                    zoomState?.isZooming && zoomState.currentScale < 1
                      ? "solid"
                      : "ghost"
                  }
                  onClick={() => {
                    if (zoomState?.isZooming) {
                      reader?.zoom.exit()
                    } else {
                      reader?.zoom.enter({
                        animate: true,
                        scale: 0.5,
                      })
                    }
                  }}
                >
                  <LuGalleryHorizontal />
                </IconButton>
                {hasGalleryEnhancer(reader) && (
                  <IconButton
                    aria-label="Gallery"
                    size="lg"
                    variant="ghost"
                    onClick={() => onItemClick("gallery")}
                  >
                    <RiGalleryView2 />
                  </IconButton>
                )}
              </Box>
            </Collapsible.Content>
          </Collapsible.Root>
        </HStack>
      </QuickBar>
    )
  },
)
