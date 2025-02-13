import { Box, Collapsible, HStack, IconButton, Stack } from "@chakra-ui/react"
import { memo, useState } from "react"
import { LuChevronDown } from "react-icons/lu"
import { LuTableOfContents } from "react-icons/lu"
import { LuCircleHelp } from "react-icons/lu"
import {
  RxDoubleArrowDown,
  RxDoubleArrowLeft,
  RxDoubleArrowRight,
  RxDoubleArrowUp,
} from "react-icons/rx"
import { useObserve } from "reactjrx"
import { useReader } from "../../context/useReader"
import { PaginationInfoSection } from "./PaginationInfoSection"
import { QuickBar } from "./QuickBar"
import { Scrubber } from "./Scrubber"

export const BottomBar = memo(
  ({
    open,
    onTableOfContentsClick,
    onHelpClick,
  }: {
    open: boolean
    onTableOfContentsClick: () => void
    onHelpClick: () => void
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
        // height={130}
      >
        <Stack
          // border="1px solid red"
          flex={1}
        >
          <HStack flex={1} alignItems="center" justifyContent="center">
            <IconButton
              aria-label="left"
              size="lg"
              variant="ghost"
              flexShrink={0}
              onClick={() => reader?.navigation.goToLeftOrTopSpineItem()}
              disabled={
                !navigation?.canGoLeftSpineItem &&
                !navigation?.canGoTopSpineItem
              }
            >
              {isVerticalDirection ? (
                <RxDoubleArrowUp />
              ) : (
                <RxDoubleArrowLeft />
              )}
            </IconButton>
            <Stack
              flex={1}
              maxW={400}
              gap={2}
              alignItems="center"
              overflow="visible"
              px={4}
            >
              <PaginationInfoSection />
              <Box height={5} maxW={300} width="100%" overflow="visible">
                <Scrubber />
              </Box>
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
          <HStack
            alignItems="center"
            justifyContent="center"
            // border="1px solid blue"
          >
            <Collapsible.Root
              open={isExtraOpen}
              flex={1}
              onOpenChange={({ open }) => {
                setIsExtraOpen(open)
              }}
            >
              <Collapsible.Trigger
                paddingY="3"
                // border="1px solid green"
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
              <Collapsible.Content
                display="flex"
                justifyContent="center"
                gap={2}
              >
                <IconButton
                  aria-label="Help"
                  size="lg"
                  variant="ghost"
                  onClick={onHelpClick}
                >
                  <LuCircleHelp />
                </IconButton>
                <IconButton
                  aria-label="Table of contents"
                  size="lg"
                  variant="ghost"
                  onClick={onTableOfContentsClick}
                >
                  <LuTableOfContents />
                </IconButton>
              </Collapsible.Content>
            </Collapsible.Root>
          </HStack>
        </Stack>
      </QuickBar>
    )
  },
)
