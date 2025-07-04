import { Collapsible, HStack, IconButton, Stack } from "@chakra-ui/react"
import { memo, useState } from "react"
import { BsBookmarks } from "react-icons/bs"
import { LuChevronDown, LuGalleryHorizontal, LuSearch } from "react-icons/lu"
import { LuTableOfContents } from "react-icons/lu"
import { LuCircleHelp, LuNotebookPen } from "react-icons/lu"
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
  hasSearchEnhancer,
  useReader,
} from "../context/useReader"
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
    const navigation = useObserve(() => reader?.navigation.state$, [reader])
    const settings = useObserve(() => reader?.settings.values$, [reader])
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
      >
        <HStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          maxWidth="100%"
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
              <IconButton
                aria-label="Thumbnails"
                size="lg"
                variant={
                  reader?.settings.values.viewportMode === "thumbnails"
                    ? "solid"
                    : "ghost"
                }
                onClick={() => {
                  reader?.settings.update({
                    viewportMode:
                      reader?.settings.values.viewportMode === "normal"
                        ? "thumbnails"
                        : "normal",
                  })
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
            </Collapsible.Content>
          </Collapsible.Root>
        </HStack>
      </QuickBar>
    )
  },
)
