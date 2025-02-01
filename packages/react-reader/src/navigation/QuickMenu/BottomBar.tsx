import { Box, IconButton, Presence, Stack } from "@chakra-ui/react"
import {
  RxDoubleArrowDown,
  RxDoubleArrowLeft,
  RxDoubleArrowRight,
  RxDoubleArrowUp,
} from "react-icons/rx"
import { useObserve } from "reactjrx"
import { useReader } from "../../context/useReader"
import { PaginationInfoSection } from "./PaginationInfoSection"
import { Scrubber } from "./Scrubber"
import { TimeIndicator } from "./TimeIndicator"

export const BottomBar = ({ open }: { open: boolean }) => {
  const reader = useReader()
  const navigation = useObserve(() => reader?.navigation.state$, [reader])
  const settings = useObserve(() => reader?.settings.values$, [reader])
  const isVerticalDirection = settings?.computedPageTurnDirection === "vertical"

  return (
    <Presence
      display="flex"
      flexDirection="row"
      present={open}
      animationName={{
        _open: "slide-from-bottom, fade-in",
        _closed: "slide-to-bottom, fade-out",
      }}
      animationDuration="moderate"
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      bgColor="bg.panel"
      alignItems="center"
      justifyContent="center"
      shadow="md"
      height={130}
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
        gap={1}
        alignItems="center"
        overflow="auto"
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
      <TimeIndicator position="absolute" bottom={0} left={0} p={2} />
    </Presence>
  )
}
