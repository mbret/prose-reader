import { useObserve } from "reactjrx"
import { distinctUntilChanged, map } from "rxjs"
import { useAudioReader } from "./useAudioReader"

export const useIsCurrentAudioTrack = ({
  enabled = true,
  trackId,
}: {
  enabled?: boolean
  trackId: string
}) => {
  const audioReader = useAudioReader()
  const { data: isCurrentTrack = false } = useObserve(
    () =>
      enabled
        ? audioReader?.audio.state$.pipe(
            map((state) => state.currentTrack?.id === trackId),
            distinctUntilChanged(),
          )
        : undefined,
    [enabled, trackId, audioReader],
  )

  return isCurrentTrack
}
