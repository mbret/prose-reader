import { getVisualizerBars } from "./bars"

const AUDIO_VISUALIZER_FFT_SIZE = 256

export type AudioVisualizerRuntime = {
  audioContext: AudioContext
  audioSourceNode: MediaElementAudioSourceNode
  analyserNode: AnalyserNode
  frequencyData: Uint8Array<ArrayBuffer>
  destroy: () => void
}

export const ensureVisualizerRuntime = ({
  runtime,
  audioElement,
}: {
  runtime: AudioVisualizerRuntime | undefined
  audioElement: HTMLAudioElement
}) => {
  if (runtime) {
    return runtime
  }

  if (typeof window === `undefined` || !window.AudioContext) {
    return undefined
  }

  const audioContext = new window.AudioContext()
  const audioSourceNode = audioContext.createMediaElementSource(audioElement)
  const analyserNode = audioContext.createAnalyser()
  analyserNode.fftSize = AUDIO_VISUALIZER_FFT_SIZE
  analyserNode.smoothingTimeConstant = 0.8
  audioSourceNode.connect(analyserNode)
  analyserNode.connect(audioContext.destination)

  return {
    audioContext,
    audioSourceNode,
    analyserNode,
    frequencyData: new Uint8Array(
      new ArrayBuffer(analyserNode.frequencyBinCount),
    ),
    destroy: () => {
      audioSourceNode.disconnect()
      analyserNode.disconnect()
      audioContext.close().catch(() => undefined)
    },
  }
}

export const readVisualizerBars = (runtime: AudioVisualizerRuntime) => {
  runtime.analyserNode.getByteFrequencyData(runtime.frequencyData)

  return getVisualizerBars(runtime.frequencyData)
}
