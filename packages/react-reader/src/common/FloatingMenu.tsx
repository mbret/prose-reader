import { Presence, type PresenceProps } from "@chakra-ui/react"
import { memo } from "react"
import { useSignalValue } from "reactjrx"
import { useReaderContextValue } from "../context/useReaderContext"

const SAFE_MARGIN_FLOATING_BOTTOM_ELEMENTS = 24

// @todo use Popover
export const FloatingMenu = memo(
  ({
    children,
    ...rest
  }: {
    present: boolean
    children: React.ReactNode
  } & PresenceProps) => {
    const { quickMenuBottomBarBoundingBoxSignal } = useReaderContextValue([
      "quickMenuBottomBarBoundingBoxSignal",
      "zoomMaxScale",
    ])
    const quickMenuBottomBarBoundingBox = useSignalValue(
      quickMenuBottomBarBoundingBoxSignal,
    )
    const bottomBarHeight =
      quickMenuBottomBarBoundingBox?.borderBoxSize?.[0]?.blockSize ||
      SAFE_MARGIN_FLOATING_BOTTOM_ELEMENTS

    return (
      <Presence
        animationName={{ _open: "fade-in", _closed: "fade-out" }}
        animationDuration="moderate"
        position="absolute"
        bottom={`calc(${bottomBarHeight}px + var(--chakra-spacing-4))`}
        right={4}
        backgroundColor="bg.panel"
        shadow="sm"
        borderRadius="md"
        p={2}
        display="flex"
        flexDirection="row"
        gap={2}
        {...rest}
      >
        {children}
      </Presence>
    )
  },
)
