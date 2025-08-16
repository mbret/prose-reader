import { Presence } from "@chakra-ui/react"
import { memo } from "react"
import { useObserve, useSignalValue } from "reactjrx"
import { Slider } from "../components/ui/slider"
import { useReader } from "../context/useReader"
import { useReaderContext } from "../context/useReaderContext"

export const ZoomControls = memo(() => {
  const { quickMenuBottomBarBoundingBox } = useReaderContext()
  const quickMenuBottomBarBoundingBoxValue = useSignalValue(
    quickMenuBottomBarBoundingBox,
  )
  const reader = useReader()
  const zoomState = useObserve(() => reader?.zoom.state$, [reader])
  const zoomScaleValue = zoomState?.currentScale ?? 1
  const isZooming = zoomState?.isZooming && zoomState.currentScale >= 1
  const bottomBarHeight =
    quickMenuBottomBarBoundingBoxValue?.borderBoxSize?.[0]?.blockSize ?? 1

  return (
    <Presence
      present={isZooming}
      animationName={{ _open: "fade-in", _closed: "fade-out" }}
      animationDuration="moderate"
      position="absolute"
      bottom={`calc(${bottomBarHeight}px + var(--chakra-spacing-4))`}
      right={4}
      backgroundColor="bg.panel"
      shadow="sm"
      borderRadius="md"
      p={4}
    >
      <Slider
        value={[zoomScaleValue]}
        min={1}
        max={5}
        step={0.5}
        minWidth={200}
        onValueChange={(e) => {
          const value = e.value?.[0] ?? 1

          if (value === 1) {
            reader?.zoom.exit()
          } else {
            reader?.zoom.scaleAt(value)
          }
        }}
      />
    </Presence>
  )
})
