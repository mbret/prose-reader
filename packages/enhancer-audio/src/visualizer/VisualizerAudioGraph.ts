import { getIdleVisualizerLevels, getVisualizerLevels } from "./levels"

const AUDIO_VISUALIZER_FFT_SIZE = 256

export class VisualizerAudioGraph {
  private audioContext: AudioContext | undefined
  private audioSourceNode: MediaElementAudioSourceNode | undefined
  private analyserNode: AnalyserNode | undefined
  private frequencyData: Uint8Array<ArrayBuffer> | undefined

  constructor(private readonly audioElement: HTMLAudioElement) {}

  async resumeIfNeeded() {
    if (!this.ensure()) {
      return false
    }

    const audioContext = this.audioContext

    if (!audioContext) {
      return false
    }

    if (audioContext.state !== `suspended`) {
      return true
    }

    try {
      await audioContext.resume()

      return true
    } catch {
      return false
    }
  }

  readLevels() {
    if (!this.analyserNode || !this.frequencyData) {
      return getIdleVisualizerLevels()
    }

    this.analyserNode.getByteFrequencyData(this.frequencyData)

    return getVisualizerLevels(this.frequencyData)
  }

  destroy() {
    this.audioSourceNode?.disconnect()
    this.analyserNode?.disconnect()
    this.audioContext?.close().catch(() => undefined)
    this.audioContext = undefined
    this.audioSourceNode = undefined
    this.analyserNode = undefined
    this.frequencyData = undefined
  }

  private ensure() {
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
}
