import { ReactiveEntity } from "@prose-reader/core"
import type { AudioTrack, AudioVisualizerState } from "../types"
import { getIdleVisualizerLevels } from "./levels"
import {
  type AudioVisualizerRuntime,
  ensureVisualizerRuntime,
  readVisualizerLevels,
} from "./runtime"

export class AudioVisualizer extends ReactiveEntity<AudioVisualizerState> {
  private runtime: AudioVisualizerRuntime | undefined
  private visualizerFrameId: number | undefined

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

    this.runtime = ensureVisualizerRuntime({
      runtime: this.runtime,
      audioElement: this.audioElement,
    })

    if (!this.runtime || this.visualizerFrameId !== undefined) return

    if (this.runtime.audioContext.state === `suspended`) {
      void this.runtime.audioContext.resume().catch(() => undefined)
    }

    this.sample()
  }

  stop({ resetBars = false }: { resetBars?: boolean } = {}) {
    if (this.visualizerFrameId !== undefined) {
      cancelAnimationFrame(this.visualizerFrameId)
      this.visualizerFrameId = undefined
    }

    this.update({
      isActive: false,
      ...(resetBars ? { levels: getIdleVisualizerLevels() } : undefined),
    })
  }

  override destroy() {
    this.stop({
      resetBars: true,
    })
    this.runtime?.destroy?.()
    this.runtime = undefined

    super.destroy()
  }

  private sample = () => {
    if (!this.runtime || this.audioElement.paused) {
      this.stop()

      return
    }

    this.update({
      levels: readVisualizerLevels(this.runtime),
      isActive: true,
    })
    this.visualizerFrameId = requestAnimationFrame(this.sample)
  }
}
