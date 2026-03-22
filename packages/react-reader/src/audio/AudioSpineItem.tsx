import type { SpineItem as CoreSpineItem } from "@prose-reader/core"
import { createPortal } from "react-dom"
import { useObserve } from "reactjrx"
import { useAudioReader } from "./useAudioReader"
import { useAudioVisualizer } from "./useAudioVisualizer"
import { useIsCurrentAudioTrack } from "./useIsCurrentAudioTrack"
import { AudioWaveCanvas } from "./wave/AudioWaveCanvas"

/**
 * Render only when there is a `renderer`. Meaning the item is loaded.
 * - Renders correct visualizer for current item.
 * - Renders default visualizer when item is not currently playing.
 */
export const AudioSpineItem = ({ item }: { item: CoreSpineItem }) => {
  const audioReader = useAudioReader()
  const isAudioRenderer = audioReader?.audio.isAudioRenderer(item.renderer)
  const audioRenderer = isAudioRenderer ? item.renderer : undefined
  const { data: audioDocumentContainer } = useObserve(
    () => audioRenderer?.watch(`documentContainer`),
    [audioRenderer, isAudioRenderer],
  )
  const isCurrentTrack = useIsCurrentAudioTrack({
    enabled: !!audioDocumentContainer,
    trackId: item.item.id,
  })
  const visualizer = useAudioVisualizer(isCurrentTrack)

  if (!audioDocumentContainer) return null

  return createPortal(
    <AudioWaveCanvas visualizer={isCurrentTrack ? visualizer : undefined} />,
    audioDocumentContainer,
  )
}
