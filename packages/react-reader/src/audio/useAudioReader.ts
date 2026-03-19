import type { AudioEnhancedReader } from "@prose-reader/enhancer-audio"
import { hasAudioEnhancer, useReader } from "../context/useReader"

export const useAudioReader = (): AudioEnhancedReader | undefined => {
  const reader = useReader()

  return hasAudioEnhancer(reader) ? reader : undefined
}
