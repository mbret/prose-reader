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
  state: AudioContextState = `running`
  readonly resume = vi.fn(async () => undefined)
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
})
