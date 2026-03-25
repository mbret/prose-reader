import type { AudioVisualizerState } from "@prose-reader/enhancer-audio"

export const FALLBACK_TOP_COLOR = `#93c5fd`
export const FALLBACK_BOTTOM_COLOR = `#3b82f6`
export const MIN_BAR_HEIGHT = 1
export const MAX_BAR_HEIGHT_RATIO = 0.1
export const IDLE_LEVEL = 0.08
export const EDGE_FADE_PORTION = 0.25
export const CENTER_EMPHASIS_RATIO = 0.15

export const DEFAULT_STATE_BASE_LEVEL = 0.02
export const DEFAULT_STATE_PEAK_LEVEL = 0.145
export const DEFAULT_STATE_HILL_SPREAD = 0.52
export const DEFAULT_STATE_MAX_BAR_HEIGHT_RATIO = 0.16
export const DEFAULT_STATE_OPACITY = 0.5
export const DEFAULT_STATE_TEXTURE_AMOUNT = 0.34

export const DEFAULT_VISUALIZER_STATE: AudioVisualizerState = {
  levels: [],
  isActive: false,
  trackId: undefined,
}
