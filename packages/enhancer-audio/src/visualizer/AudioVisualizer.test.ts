/* @vitest-environment happy-dom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { AudioTrack } from "../types"

import { AudioVisualizer } from "./AudioVisualizer"
import { getIdleVisualizerLevels } from "./levels"

const createTrack = (id = `track-1`): AudioTrack => ({
  id,
  href: `${id}.mp3`,
  index: 0,
  mediaType: `audio/mpeg`,
})

class FakeAudioContext {
  static instances: FakeAudioContext[] = []
  static nextState: AudioContextState = `running`
  static resumeImpl: () => Promise<void> = async () => undefined

  readonly destination = {}
  readonly sourceNode = {
    connect: vi.fn(),
    disconnect: vi.fn(),
  }
  readonly analyserNode = {
    fftSize: 0,
    smoothingTimeConstant: 0,
    frequencyBinCount: 4,
    connect: vi.fn(),
    disconnect: vi.fn(),
    getByteFrequencyData: vi.fn((data: Uint8Array) => {
      data.set([0, 64, 128, 255])
    }),
  }
  state: AudioContextState = FakeAudioContext.nextState
  readonly resume = vi.fn(() => FakeAudioContext.resumeImpl())
  readonly close = vi.fn(async () => undefined)

  constructor() {
    FakeAudioContext.instances.push(this)
  }

  createMediaElementSource() {
    return this.sourceNode as unknown as MediaElementAudioSourceNode
  }

  createAnalyser() {
    return this.analyserNode as unknown as AnalyserNode
  }
}

describe(`AudioVisualizer`, () => {
  beforeEach(() => {
    vi.useFakeTimers()
    FakeAudioContext.instances = []
    FakeAudioContext.nextState = `running`
    FakeAudioContext.resumeImpl = async () => undefined
    vi.stubGlobal(`AudioContext`, FakeAudioContext)
    vi.stubGlobal(
      `requestAnimationFrame`,
      vi.fn((callback: FrameRequestCallback) => {
        return setTimeout(
          () => callback(performance.now()),
          16,
        ) as unknown as number
      }),
    )
    vi.stubGlobal(
      `cancelAnimationFrame`,
      vi.fn((handle: number) => {
        clearTimeout(handle)
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it(`samples through a single stream lifecycle and tears runtime down`, async () => {
    const visualizer = new AudioVisualizer(document.createElement(`audio`))

    visualizer.start(createTrack())
    visualizer.start(createTrack())

    await vi.advanceTimersByTimeAsync(16)

    expect(FakeAudioContext.instances).toHaveLength(1)
    expect(visualizer.value.trackId).toBe(`track-1`)
    expect(visualizer.value.isActive).toBe(true)
    expect(visualizer.value.levels).toHaveLength(80)
    expect(visualizer.value.levels.some((level) => level > 0)).toBe(true)

    visualizer.stop({
      resetLevels: true,
    })

    expect(visualizer.value).toEqual({
      trackId: `track-1`,
      isActive: false,
      levels: getIdleVisualizerLevels(),
    })

    visualizer.destroy()

    expect(FakeAudioContext.instances[0]?.close).toHaveBeenCalledTimes(1)
  })

  it(`keeps the requested track id when stopped before the first sample`, () => {
    const visualizer = new AudioVisualizer(document.createElement(`audio`))

    visualizer.start(createTrack(`track-2`))
    visualizer.stop({
      resetLevels: true,
    })

    expect(visualizer.value).toEqual({
      trackId: `track-2`,
      isActive: false,
      levels: getIdleVisualizerLevels(),
    })
  })

  it(`stays idle when resuming the audio context fails`, async () => {
    FakeAudioContext.nextState = `suspended`
    FakeAudioContext.resumeImpl = async () => {
      throw new Error(`resume failed`)
    }

    const visualizer = new AudioVisualizer(document.createElement(`audio`))

    visualizer.start(createTrack(`track-3`))
    await vi.advanceTimersByTimeAsync(16)

    expect(FakeAudioContext.instances).toHaveLength(1)
    expect(FakeAudioContext.instances[0]?.resume).toHaveBeenCalledTimes(1)
    expect(visualizer.value).toEqual({
      trackId: undefined,
      isActive: false,
      levels: getIdleVisualizerLevels(),
    })
  })

  it(`keeps only the latest track across rapid transitions`, () => {
    const visualizer = new AudioVisualizer(document.createElement(`audio`))

    visualizer.start(createTrack(`track-1`))
    visualizer.start(createTrack(`track-2`))
    visualizer.reset(`track-2`)

    expect(visualizer.value).toEqual({
      trackId: `track-2`,
      isActive: false,
      levels: getIdleVisualizerLevels(),
    })
  })
})
