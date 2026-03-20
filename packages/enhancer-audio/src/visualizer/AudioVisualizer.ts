import { ReactiveEntity } from "@prose-reader/core"
import {
  animationFrames,
  BehaviorSubject,
  defer,
  distinctUntilChanged,
  EMPTY,
  from,
  map,
  of,
  Subscription,
  switchMap,
} from "rxjs"
import type { AudioTrack, AudioVisualizerState } from "../types"
import { getIdleVisualizerLevels } from "./levels"
import { VisualizerAudioGraph } from "./VisualizerAudioGraph"

type AudioVisualizerPlaybackState = {
  trackId: string | undefined
  isRunning: boolean
  resetLevels: boolean
}

export class AudioVisualizer extends ReactiveEntity<AudioVisualizerState> {
  private readonly audioGraph: VisualizerAudioGraph
  private readonly playbackState$ =
    new BehaviorSubject<AudioVisualizerPlaybackState>({
      trackId: undefined,
      isRunning: false,
      resetLevels: false,
    })
  private readonly subscriptions = new Subscription()

  constructor(audioElement: HTMLAudioElement) {
    super({
      levels: getIdleVisualizerLevels(),
      isActive: false,
      trackId: undefined,
    })
    this.audioGraph = new VisualizerAudioGraph(audioElement)

    this.subscriptions.add(
      this.playbackState$
        .pipe(
          distinctUntilChanged(
            (previous, next) =>
              previous.trackId === next.trackId &&
              previous.isRunning === next.isRunning &&
              previous.resetLevels === next.resetLevels,
          ),
          switchMap(({ trackId, isRunning, resetLevels }) => {
            if (!trackId || !isRunning) {
              return of({
                trackId,
                isActive: false,
                ...(resetLevels
                  ? { levels: getIdleVisualizerLevels() }
                  : undefined),
              })
            }

            return this.createLevels$().pipe(
              map((levels) => ({
                trackId,
                levels,
                isActive: true,
              })),
            )
          }),
        )
        .subscribe((value) => {
          this.update(value)
        }),
    )
  }

  update(value: Partial<AudioVisualizerState>) {
    this.mergeCompare(value)
  }

  start(currentTrack: AudioTrack) {
    this.playbackState$.next({
      trackId: currentTrack.id,
      isRunning: true,
      resetLevels: false,
    })
  }

  stop({ resetLevels = false }: { resetLevels?: boolean } = {}) {
    this.playbackState$.next({
      trackId: this.playbackState$.value.trackId,
      isRunning: false,
      resetLevels,
    })
  }

  override destroy() {
    this.stop({
      resetLevels: true,
    })
    this.subscriptions.unsubscribe()
    this.playbackState$.complete()
    this.destroyAudioGraph()

    super.destroy()
  }

  private createLevels$() {
    return defer(() => {
      return from(this.audioGraph.resumeIfNeeded()).pipe(
        switchMap((isReady) =>
          isReady
            ? animationFrames().pipe(map(() => this.audioGraph.readLevels()))
            : EMPTY,
        ),
      )
    })
  }

  private destroyAudioGraph() {
    this.audioGraph.destroy()
  }
}
