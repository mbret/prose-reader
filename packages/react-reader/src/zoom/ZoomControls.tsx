import { Presence } from "@chakra-ui/react"
import { memo } from "react"
import { useObserve, useSignalValue } from "reactjrx"
import { animationFrameScheduler, map, throttleTime } from "rxjs"
import { Slider } from "../components/ui/slider"
import { useReader } from "../context/useReader"
import { useReaderContextValue } from "../context/useReaderContext"

const STEP = 0.5
const MIN = 1
const MAX = 5

const normalizeZoomValue = (
  value: number,
  min: number,
  max: number,
  step: number,
): number => {
  if (value > min && value < min + step) {
    return min + step
  }

  // Clamp to min/max bounds
  const clamped = Math.min(Math.max(value, min), max)
  // Round to nearest step
  const stepped = Math.round((clamped - min) / step) * step + min
  // Round to avoid floating point precision issues
  return Math.round(stepped * 100) / 100
}

export const ZoomControls = memo(() => {
  const { quickMenuBottomBarBoundingBoxSignal } = useReaderContextValue([
    "quickMenuBottomBarBoundingBoxSignal",
  ])
  const quickMenuBottomBarBoundingBox = useSignalValue(
    quickMenuBottomBarBoundingBoxSignal,
  )

  const reader = useReader()
  const zoomScaleValue =
    useObserve(
      () =>
        reader?.zoom.state$.pipe(
          map((state) => state.currentScale),
          throttleTime(100, animationFrameScheduler, {
            leading: true,
            trailing: true,
          }),
        ),
      [reader],
    ) ?? 1
  const isZooming =
    useObserve(
      () => reader?.zoom.state$.pipe(map((state) => state.isZooming)),
      [reader],
    ) ?? false
  const normalizedZoomScaleValue = normalizeZoomValue(
    zoomScaleValue,
    MIN,
    MAX,
    STEP,
  )
  const bottomBarHeight =
    quickMenuBottomBarBoundingBox?.borderBoxSize?.[0]?.blockSize ?? 1

  return (
    <Presence
      present={isZooming && zoomScaleValue > 1}
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
        value={[normalizedZoomScaleValue]}
        min={MIN}
        max={MAX}
        step={STEP}
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
