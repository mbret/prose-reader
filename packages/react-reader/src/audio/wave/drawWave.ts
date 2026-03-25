import type { AudioVisualizerState } from "@prose-reader/enhancer-audio"
import {
  CENTER_EMPHASIS_RATIO,
  DEFAULT_STATE_MAX_BAR_HEIGHT_RATIO,
  DEFAULT_STATE_OPACITY,
  EDGE_FADE_PORTION,
  MAX_BAR_HEIGHT_RATIO,
  MIN_BAR_HEIGHT,
} from "./constants"
import {
  clamp,
  getDefaultDisplayBars,
  getMirroredDisplayBars,
  hasMeaningfulLevels,
  smoothstep,
} from "./shaping"

type WaveSize = {
  width: number
  height: number
}

type DrawWaveArgs = {
  canvas: HTMLCanvasElement
  size: WaveSize
  visualizer: AudioVisualizerState
  displayBarCount: number
  displayedBars: number[]
  fillStyle: CanvasGradient | string
}

export const drawWave = ({
  canvas,
  size,
  visualizer,
  displayBarCount,
  displayedBars,
  fillStyle,
}: DrawWaveArgs) => {
  const context = canvas.getContext(`2d`)
  const { width, height } = size

  if (!context || width <= 0 || height <= 0) return displayedBars

  context.clearRect(0, 0, width, height)

  const hasPlayedLevels = hasMeaningfulLevels(visualizer.levels)
  const isDefaultState = !visualizer.isActive && !hasPlayedLevels
  const displayBars = isDefaultState
    ? getDefaultDisplayBars(displayBarCount)
    : getMirroredDisplayBars(visualizer.levels, displayBarCount)

  const nextDisplayedBars =
    displayedBars.length !== displayBars.length
      ? Array.from({ length: displayBars.length }, () => 0)
      : displayedBars

  const easedBars = visualizer.isActive
    ? nextDisplayedBars.map((value, index) => {
        const targetValue = displayBars[index] ?? 0
        const easing = 0.28

        return value + (targetValue - value) * easing
      })
    : [...displayBars]

  const gap = Math.round(
    clamp(width / Math.max(easedBars.length, 1) / 2.8, 1, 4),
  )
  const barWidth = Math.max(
    2,
    Math.floor((width - gap * (easedBars.length - 1)) / easedBars.length),
  )
  const totalWidth = barWidth * easedBars.length + gap * (easedBars.length - 1)
  const startX = Math.max(0, (width - totalWidth) / 2)
  const centerY = height / 2
  const maxHeight = Math.max(
    MIN_BAR_HEIGHT,
    height *
      (isDefaultState
        ? DEFAULT_STATE_MAX_BAR_HEIGHT_RATIO
        : MAX_BAR_HEIGHT_RATIO),
  )
  context.fillStyle = fillStyle

  for (const [index, rawValue] of easedBars.entries()) {
    const amplitude = clamp(rawValue, 0, 1)
    const progress =
      easedBars.length === 1 ? 0.5 : index / (easedBars.length - 1)
    const centerDistance = Math.abs(progress - 0.5) * 2
    const centerProfile = 1 - smoothstep(0, 1, centerDistance)
    const emphasizedAmplitude =
      (amplitude * (1 + CENTER_EMPHASIS_RATIO * centerProfile)) /
      (1 + CENTER_EMPHASIS_RATIO * centerProfile * amplitude)
    const heightProgress = isDefaultState
      ? amplitude
      : emphasizedAmplitude ** 1.15
    const barHeight = Math.max(MIN_BAR_HEIGHT, heightProgress * maxHeight)
    const barRadius = Math.min(barWidth / 2, barHeight / 2)
    const x = Math.round(startX + index * (barWidth + gap))
    const y = centerY - barHeight / 2
    const edgeFade =
      smoothstep(0, EDGE_FADE_PORTION, progress) *
      (1 - smoothstep(1 - EDGE_FADE_PORTION, 1, progress))

    context.globalAlpha = clamp(
      (isDefaultState
        ? DEFAULT_STATE_OPACITY
        : visualizer.isActive
          ? 0.95
          : 0.75) * edgeFade,
      0,
      1,
    )
    context.beginPath()
    context.roundRect(x, y, barWidth, barHeight, barRadius)
    context.fill()
  }

  context.globalAlpha = 1

  return easedBars
}
