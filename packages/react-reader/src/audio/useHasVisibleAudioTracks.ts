import { useObserve } from "reactjrx"
import { distinctUntilChanged, map } from "rxjs"
import { useAudioReader } from "./useAudioReader"

export const useHasVisibleAudioTracks = () => {
  const audioReader = useAudioReader()
  const { data: hasVisibleAudioTracks = false } = useObserve(
    () =>
      audioReader?.audio.visibleTrackIds$.pipe(
        map((trackIds) => trackIds.length > 0),
        distinctUntilChanged(),
      ),
    [audioReader],
  )

  return hasVisibleAudioTracks
}
