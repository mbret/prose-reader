import { Box, IconButton, Stack } from "@chakra-ui/react"
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

export const BottomBar = ({ open }: { open: boolean }) => {
  const reader = useReader()
  const navigation = useObserve(() => reader?.navigation.state$, [reader])
  const settings = useObserve(() => reader?.settings.values$, [reader])
  const isVerticalDirection = settings?.computedPageTurnDirection === "vertical"

  return (
    <QuickBar present={open} position="bottom" height={130}>
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
          !navigation?.canGoRightSpineItem && !navigation?.canGoBottomSpineItem
        }
        onClick={() => {
          reader?.navigation.goToRightOrBottomSpineItem()
        }}
      >
        {isVerticalDirection ? <RxDoubleArrowDown /> : <RxDoubleArrowRight />}
      </IconButton>
    </QuickBar>
  )
}
