/* @vitest-environment happy-dom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AudioElementAdapter } from "./AudioElementAdapter"

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

describe(`AudioElementAdapter`, () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, `pause`).mockImplementation(
      () => undefined,
    )
    vi.spyOn(HTMLMediaElement.prototype, `load`).mockImplementation(
      () => undefined,
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it(`mounts and clears the active source`, () => {
    const releaseTrackSource = vi.fn()
    const adapter = new AudioElementAdapter(releaseTrackSource)

    adapter.setSource({
      trackId: `track-1`,
      source: `blob:track-1`,
    })

    expect(adapter.hasSource).toBe(true)
    expect(adapter.element.getAttribute(`src`)).toBe(`blob:track-1`)

    adapter.clearSource()

    expect(adapter.hasSource).toBe(false)
    expect(adapter.element.getAttribute(`src`)).toBe(null)
    expect(releaseTrackSource).toHaveBeenCalledWith(`track-1`)
  })

  it(`releases the previously mounted track source when switching tracks`, () => {
    const releaseTrackSource = vi.fn()
    const adapter = new AudioElementAdapter(releaseTrackSource)

    adapter.setSource({
      trackId: `track-1`,
      source: `blob:track-1`,
    })
    adapter.setSource({
      trackId: `track-2`,
      source: `blob:track-2`,
    })

    expect(releaseTrackSource).toHaveBeenCalledWith(`track-1`)
    expect(releaseTrackSource).not.toHaveBeenCalledWith(`track-2`)
  })

  it(`retries playback once on canplay after a failed play attempt`, async () => {
    const adapter = new AudioElementAdapter(vi.fn())
    const playSpy = vi
      .spyOn(adapter.element, `play`)
      .mockRejectedValueOnce(new Error(`not ready`))
      .mockResolvedValueOnce(undefined)

    adapter.setPlaybackIntent({
      shouldPlay: true,
      trackId: `track-1`,
    })
    adapter.setSource({
      trackId: `track-1`,
      source: `blob:track-1`,
    })

    await flush()

    expect(playSpy).toHaveBeenCalledTimes(1)

    adapter.element.dispatchEvent(new Event(`canplay`))

    await flush()

    expect(playSpy).toHaveBeenCalledTimes(2)
  })

  it(`does not replay on canplay after a successful play attempt`, async () => {
    const adapter = new AudioElementAdapter(vi.fn())
    const playSpy = vi
      .spyOn(adapter.element, `play`)
      .mockResolvedValue(undefined)

    adapter.setPlaybackIntent({
      shouldPlay: true,
      trackId: `track-1`,
    })
    adapter.setSource({
      trackId: `track-1`,
      source: `blob:track-1`,
    })

    await flush()

    expect(playSpy).toHaveBeenCalledTimes(1)

    adapter.element.dispatchEvent(new Event(`canplay`))

    await flush()

    expect(playSpy).toHaveBeenCalledTimes(1)
  })

  it(`releases the mounted source on destroy`, () => {
    const releaseTrackSource = vi.fn()
    const adapter = new AudioElementAdapter(releaseTrackSource)

    adapter.setSource({
      trackId: `track-1`,
      source: `blob:track-1`,
    })

    adapter.destroy()

    expect(releaseTrackSource).toHaveBeenCalledWith(`track-1`)
  })
})
