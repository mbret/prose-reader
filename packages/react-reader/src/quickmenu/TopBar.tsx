import { HStack, IconButton, Stack, Text } from "@chakra-ui/react"
import { memo } from "react"
import { IoIosArrowBack, IoMdMore } from "react-icons/io"
import { MdFullscreen, MdFullscreenExit } from "react-icons/md"
import { useObserve } from "reactjrx"
import { useFullscreen } from "../common/useFullscreen"
import { useReader } from "../context/useReader"
import { QuickBar } from "./QuickBar"

export const TopBar = memo(
  ({
    open,
    onItemClick,
  }: {
    open: boolean
    onItemClick: (item: "more" | "back") => void
  }) => {
    const reader = useReader()
    const manifest = useObserve(() => reader?.context.manifest$, [reader])
    const { isFullscreen, onToggleFullscreenClick } = useFullscreen()

    return (
      <QuickBar
        present={open}
        position="top"
        height="80px"
        justifyContent="space-between"
      >
        <IconButton
          aria-label="left"
          size="lg"
          variant="ghost"
          flexShrink={0}
          onClick={() => onItemClick("back")}
        >
          <IoIosArrowBack />
        </IconButton>
        <Stack
          flex={1}
          maxW={600}
          gap={1}
          alignItems="center"
          overflow="auto"
          px={4}
        >
          <Text truncate maxWidth="100%">
            {manifest?.title}
          </Text>
        </Stack>
        <HStack>
          <IconButton
            aria-label="right"
            size="lg"
            flexShrink={0}
            variant="ghost"
            onClick={() => onItemClick("more")}
          >
            <IoMdMore />
          </IconButton>
          <IconButton
            aria-label="right"
            size="lg"
            flexShrink={0}
            variant="ghost"
            onClick={onToggleFullscreenClick}
          >
            {isFullscreen ? <MdFullscreenExit /> : <MdFullscreen />}
          </IconButton>
        </HStack>
      </QuickBar>
    )
  },
)
