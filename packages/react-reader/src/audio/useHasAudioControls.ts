import { useHasVisibleAudioTracks } from "./useHasVisibleAudioTracks"

export const useHasAudioControls = () => {
  return useHasVisibleAudioTracks()
}
