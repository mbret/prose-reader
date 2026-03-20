import type { DocumentRenderer, Manifest, Reader } from "@prose-reader/core"
import type { Observable } from "rxjs"
import type { AudioRenderer } from "./renderer/AudioRenderer"

export type AudioTrack = Pick<
  Manifest["spineItems"][number],
  "id" | "href" | "index" | "mediaType"
>

export type AudioEnhancerState = {
  tracks: AudioTrack[]
  currentTrack: AudioTrack | undefined
  isPlaying: boolean
  isLoading: boolean
  currentTime: number
  duration: number
}

export type AudioVisualizerState = {
  levels: number[]
  isActive: boolean
  trackId: string | undefined
}

export type SelectAudioTrackOptions = {
  play?: boolean
  navigate?: boolean
}

export type AudioEnhancerAPI = {
  readonly __PROSE_READER_ENHANCER_AUDIO: true
  audio: {
    state$: Observable<AudioEnhancerState>
    visualizer$: Observable<AudioVisualizerState>
    /**
     * Audio track ids at the current pagination boundaries.
     *
     * This is intentionally boundary-based and should not be interpreted as
     * "every audio track currently visible on screen".
     */
    visibleTrackIds$: Observable<string[]>
    get state(): AudioEnhancerState
    get visualizer(): AudioVisualizerState
    isAudioRenderer: (renderer: DocumentRenderer) => renderer is AudioRenderer
    play: () => void
    pause: () => void
    toggle: () => void
    setCurrentTime: (value: number) => void
    select: (
      track: AudioTrack | number | string,
      options?: SelectAudioTrackOptions,
    ) => void
  }
}

export type AudioEnhancedReader<TReader extends Reader = Reader> = TReader &
  AudioEnhancerAPI
