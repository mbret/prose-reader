import { ReactiveEntity } from "@prose-reader/core"
import {
  animationFrames,
  BehaviorSubject,
  catchError,
  defer,
  distinctUntilChanged,
  EMPTY,
  from,
  fromEvent,
  map,
  merge,
  of,
  Subscription,
  switchMap,
  takeUntil,
} from "rxjs"
import type { AudioTrack, AudioVisualizerState } from "../types"
import { getIdleVisualizerLevels, getVisualizerLevels } from "./levels"

const AUDIO_VISUALIZER_FFT_SIZE = 256

type AudioVisualizerPlaybackState = {
  trackId: string | undefined
  isRunning: boolean
  resetLevels: boolean
}

export class AudioVisualizer extends ReactiveEntity<AudioVisualizerState> {
  private audioContext: AudioContext | undefined
  private audioSourceNode: MediaElementAudioSourceNode | undefined
  private analyserNode: AnalyserNode | undefined
  private frequencyData: Uint8Array<ArrayBuffer> | undefined
  private readonly playbackState$ =
    new BehaviorSubject<AudioVisualizerPlaybackState>({
      trackId: undefined,
      isRunning: false,
      resetLevels: false,
    })
  private readonly subscriptions = new Subscription()

  constructor(private readonly audioElement: HTMLAudioElement) {
    super({
      levels: getIdleVisualizerLevels(),
      isActive: false,
      trackId: undefined,
    })

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
                isActive: false,
                ...(resetLevels
                  ? { levels: getIdleVisualizerLevels() }
                  : undefined),
              })
            }

            return this.createLevels$().pipe(
              takeUntil(
                merge(
                  fromEvent(this.audioElement, `pause`),
                  fromEvent(this.audioElement, `ended`),
                ),
              ),
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

  start(currentTrack: AudioTrack | undefined) {
    if (!currentTrack) return
    this.playbackState$.next({
      trackId: currentTrack.id,
      isRunning: true,
      resetLevels: false,
    })
  }

  stop({ resetLevels = false }: { resetLevels?: boolean } = {}) {
    this.playbackState$.next({
      trackId: this.value.trackId,
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

  private ensureAudioGraph() {
    if (this.audioContext && this.analyserNode && this.frequencyData) {
      return true
    }

    if (typeof window === `undefined` || !window.AudioContext) {
      return false
    }

    const audioContext = new window.AudioContext()
    const audioSourceNode = audioContext.createMediaElementSource(
      this.audioElement,
    )
    const analyserNode = audioContext.createAnalyser()
    analyserNode.fftSize = AUDIO_VISUALIZER_FFT_SIZE
    analyserNode.smoothingTimeConstant = 0.8
    audioSourceNode.connect(analyserNode)
    analyserNode.connect(audioContext.destination)

    this.audioContext = audioContext
    this.audioSourceNode = audioSourceNode
    this.analyserNode = analyserNode
    this.frequencyData = new Uint8Array(
      new ArrayBuffer(analyserNode.frequencyBinCount),
    )

    return true
  }

  private createLevels$() {
    return defer(() => {
      if (!this.ensureAudioGraph()) {
        return EMPTY
      }

      const resumeAudioContext$ = () => {
        const audioContext = this.audioContext

        if (!audioContext) {
          return EMPTY
        }

        if (audioContext.state !== `suspended`) {
          return of(undefined)
        }

        return from(audioContext.resume()).pipe(
          map(() => undefined),
          catchError(() => of(undefined)),
        )
      }

      return resumeAudioContext$().pipe(
        switchMap(() => {
          const readLevels = () => {
            if (!this.analyserNode || !this.frequencyData) {
              return getIdleVisualizerLevels()
            }

            this.analyserNode.getByteFrequencyData(this.frequencyData)

            return getVisualizerLevels(this.frequencyData)
          }

          return animationFrames().pipe(map(() => readLevels()))
        }),
      )
    })
  }

  private destroyAudioGraph() {
    this.audioSourceNode?.disconnect()
    this.analyserNode?.disconnect()
    this.audioContext?.close().catch(() => undefined)
    this.audioContext = undefined
    this.audioSourceNode = undefined
    this.analyserNode = undefined
    this.frequencyData = undefined
  }
}
