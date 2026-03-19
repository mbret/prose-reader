import { Box, useBreakpointValue } from "@chakra-ui/react"
import type { AudioVisualizerState } from "@prose-reader/enhancer-audio"
import { useCallback, useEffect, useRef } from "react"
import { FALLBACK_BOTTOM_COLOR, FALLBACK_TOP_COLOR } from "./constants"
import { drawWave as drawWaveFrame } from "./drawWave"
import { getNormalizedDisplayBarCount, resolveGradientColors } from "./shaping"

const DEFAULT_VISUALIZER: AudioVisualizerState = {
  bars: [],
  isActive: false,
  trackId: undefined,
}

export const AudioWaveCanvas = ({
  visualizer,
}: {
  visualizer?: AudioVisualizerState
}) => {
  const displayBarCount = getNormalizedDisplayBarCount(
    useBreakpointValue({
      base: 29,
      md: 35,
      lg: 41,
      xl: 49,
    }) ?? 29,
  )
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const frameRef = useRef<number | undefined>(undefined)
  const visualizerRef = useRef<AudioVisualizerState>(
    visualizer ?? DEFAULT_VISUALIZER,
  )
  const displayedBarsRef = useRef<number[]>([])
  const fillStyleRef = useRef<CanvasGradient | string>(FALLBACK_BOTTOM_COLOR)
  const sizeRef = useRef({
    width: 0,
    height: 0,
  })

  /**
   * Cache the gradient outside the animation loop to avoid repeated
   * `getComputedStyle()` and gradient allocation during playback.
   *
   * Limitation: the resolved Chakra CSS variable colors are treated as static
   * for the current canvas size. Theme or palette changes after mount are not
   * picked up immediately; the gradient is refreshed on resize and remount.
   */
  const refreshFillStyle = useCallback(() => {
    const canvas = canvasRef.current

    if (!canvas || sizeRef.current.height <= 0) return

    const context = canvas.getContext(`2d`)

    if (!context) return

    const { topColor, bottomColor } = resolveGradientColors(canvas, {
      topVariable: `--audio-wave-top-color`,
      topFallback: FALLBACK_TOP_COLOR,
      bottomVariable: `--audio-wave-bottom-color`,
      bottomFallback: FALLBACK_BOTTOM_COLOR,
    })
    const gradient = context.createLinearGradient(
      0,
      0,
      0,
      sizeRef.current.height,
    )

    gradient.addColorStop(0, topColor)
    gradient.addColorStop(1, bottomColor)

    fillStyleRef.current = gradient
  }, [])

  const drawWave = useCallback(() => {
    const canvas = canvasRef.current

    if (!canvas) return

    const visualizer = visualizerRef.current

    displayedBarsRef.current = drawWaveFrame({
      canvas,
      size: sizeRef.current,
      visualizer,
      displayBarCount,
      displayedBars: displayedBarsRef.current,
      fillStyle: fillStyleRef.current,
    })
  }, [displayBarCount])

  const stopAnimation = useCallback(() => {
    if (frameRef.current !== undefined) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = undefined
    }
  }, [])

  const startAnimation = useCallback(() => {
    if (frameRef.current !== undefined) return

    const tick = () => {
      const visualizer = visualizerRef.current

      if (!visualizer.isActive) {
        frameRef.current = undefined
        drawWave()

        return
      }

      drawWave()
      frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
  }, [drawWave])

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current

    if (!canvas || !container) return

    const nextWidth = Math.max(1, container.clientWidth)
    const nextHeight = Math.max(1, container.clientHeight)
    const pixelRatio = window.devicePixelRatio || 1

    sizeRef.current = {
      width: nextWidth,
      height: nextHeight,
    }

    canvas.width = Math.round(nextWidth * pixelRatio)
    canvas.height = Math.round(nextHeight * pixelRatio)
    canvas.style.width = `${nextWidth}px`
    canvas.style.height = `${nextHeight}px`

    const context = canvas.getContext(`2d`)

    if (context) {
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }

    refreshFillStyle()
    drawWave()
  }, [drawWave, refreshFillStyle])

  useEffect(() => {
    visualizerRef.current = visualizer ?? DEFAULT_VISUALIZER

    if (visualizerRef.current.isActive) {
      startAnimation()
      return
    }

    stopAnimation()
    drawWave()
  }, [drawWave, startAnimation, stopAnimation, visualizer])

  useEffect(() => {
    const container = containerRef.current

    if (!container) return

    resizeCanvas()

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas()
    })

    resizeObserver.observe(container)

    return () => {
      stopAnimation()
      resizeObserver.disconnect()
    }
  }, [resizeCanvas, stopAnimation])

  return (
    <Box
      ref={containerRef}
      position="absolute"
      inset={0}
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={8}
      py={12}
      pointerEvents="none"
      css={{
        "--audio-wave-top-color": "colors.colorPalette.emphasized",
        "--audio-wave-bottom-color": "colors.colorPalette.solid",
      }}
      style={{
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 25%, black 75%, transparent 100%)",
        maskImage:
          "linear-gradient(to right, transparent 0%, black 25%, black 75%, transparent 100%)",
      }}
    >
      <canvas ref={canvasRef} />
    </Box>
  )
}
