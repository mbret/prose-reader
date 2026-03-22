import type { AudioEnhancerState } from "@prose-reader/enhancer-audio"
import { useObserve } from "reactjrx"
import { useAudioReader } from "./useAudioReader"

export const useAudioState = () => {
  const audioReader = useAudioReader()
  const { data: audioState } = useObserve<AudioEnhancerState | undefined>(
    () => audioReader?.audio.state$,
    [audioReader],
  )

  return audioState
}
