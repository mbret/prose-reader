import type { AudioVisualizerState } from "@prose-reader/enhancer-audio"
import { useObserve } from "reactjrx"
import { useAudioReader } from "./useAudioReader"

export const useAudioVisualizer = (enabled = true) => {
  const audioReader = useAudioReader()
  const { data: visualizer } = useObserve<AudioVisualizerState | undefined>(
    () => (enabled ? audioReader?.audio.visualizer$ : undefined),
    [enabled, audioReader],
  )

  return visualizer
}
