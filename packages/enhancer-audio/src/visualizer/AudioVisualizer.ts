import { ReactiveEntity } from "@prose-reader/core"
import {
  animationFrames,
  catchError,
  defer,
  EMPTY,
  from,
  map,
  type Subscription,
  switchMap,
} from "rxjs"
import type { AudioTrack, AudioVisualizerState } from "../types"
import { getIdleVisualizerLevels, getVisualizerLevels } from "./levels"

const AUDIO_VISUALIZER_FFT_SIZE = 256

export class AudioVisualizer extends ReactiveEntity<AudioVisualizerState> {
  private audioContext: AudioContext | undefined
  private audioSourceNode: MediaElementAudioSourceNode | undefined
  private analyserNode: AnalyserNode | undefined
  private frequencyData: Uint8Array<ArrayBuffer> | undefined
  private samplingSubscription: Subscription | undefined

  constructor(private readonly audioElement: HTMLAudioElement) {
    super({
      levels: getIdleVisualizerLevels(),
      isActive: false,
      trackId: undefined,
    })
  }

  update(value: Partial<AudioVisualizerState>) {
    this.mergeCompare(value)
  }

  start(currentTrack: AudioTrack | undefined) {
    if (!currentTrack) return

    if (
      this.value.trackId === currentTrack.id &&
      this.value.isActive &&
      this.samplingSubscription
    ) {
      return
    }

    this.samplingSubscription?.unsubscribe()
    this.update({
      trackId: currentTrack.id,
      isActive: true,
    })
    this.samplingSubscription = this.createLevels$().subscribe((levels) => {
      this.update({
        trackId: currentTrack.id,
        levels,
        isActive: true,
      })
    })
  }

  stop({ resetLevels = false }: { resetLevels?: boolean } = {}) {
    this.samplingSubscription?.unsubscribe()
    this.samplingSubscription = undefined
    this.update({
      trackId: this.value.trackId,
      isActive: false,
      ...(resetLevels ? { levels: getIdleVisualizerLevels() } : undefined),
    })
  }

  override destroy() {
    this.stop({
      resetLevels: true,
    })
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
    this.frequencyData = new Uint8Array(analyserNode.frequencyBinCount)

    return true
  }

  private createLevels$() {
    return defer(() => {
      if (!this.ensureAudioGraph()) {
        return EMPTY
      }

      const audioContext = this.audioContext

      if (!audioContext) {
        return EMPTY
      }

      if (audioContext.state !== `suspended`) {
        return animationFrames().pipe(map(() => this.readLevels()))
      }

      return from(audioContext.resume()).pipe(
        catchError(() => EMPTY),
        switchMap(() => animationFrames().pipe(map(() => this.readLevels()))),
      )
    })
  }

  private readLevels() {
    if (!this.analyserNode || !this.frequencyData) {
      return getIdleVisualizerLevels()
    }

    this.analyserNode.getByteFrequencyData(this.frequencyData)

    return getVisualizerLevels(this.frequencyData)
  }

  private destroyAudioGraph() {
    this.samplingSubscription?.unsubscribe()
    this.samplingSubscription = undefined
    this.audioSourceNode?.disconnect()
    this.analyserNode?.disconnect()
    this.audioContext?.close().catch(() => undefined)
    this.audioContext = undefined
    this.audioSourceNode = undefined
    this.analyserNode = undefined
    this.frequencyData = undefined
  }
}
