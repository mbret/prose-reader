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
    const adapter = new AudioElementAdapter()

    adapter.setSource({
      trackId: `track-1`,
      source: `blob:track-1`,
    })

    expect(adapter.hasSource).toBe(true)
    expect(adapter.element.getAttribute(`src`)).toBe(`blob:track-1`)

    adapter.clearSource()

    expect(adapter.hasSource).toBe(false)
    expect(adapter.element.getAttribute(`src`)).toBe(null)
  })

  it(`emits mounted track id transitions when sources change`, () => {
    const adapter = new AudioElementAdapter()
    const mountedTrackIds: Array<string | undefined> = []

    const subscription = adapter.mountedTrackId$.subscribe((mountedTrackId) => {
      mountedTrackIds.push(mountedTrackId)
    })

    adapter.setSource({
      trackId: `track-1`,
      source: `blob:track-1`,
    })
    adapter.setSource({
      trackId: `track-2`,
      source: `blob:track-2`,
    })
    adapter.clearSource()

    expect(mountedTrackIds).toEqual([
      undefined,
      `track-1`,
      `track-2`,
      undefined,
    ])

    subscription.unsubscribe()
  })

  it(`retries playback once on canplay after a failed play attempt`, async () => {
    const adapter = new AudioElementAdapter()
    const playSpy = vi
      .spyOn(adapter.element, `play`)
      .mockRejectedValueOnce(new Error(`not ready`))
      .mockResolvedValueOnce(undefined)

    adapter.play(`track-1`)
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
    const adapter = new AudioElementAdapter()
    const playSpy = vi
      .spyOn(adapter.element, `play`)
      .mockResolvedValue(undefined)

    adapter.play(`track-1`)
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

  it(`clears the element source on destroy`, () => {
    const adapter = new AudioElementAdapter()

    adapter.setSource({
      trackId: `track-1`,
      source: `blob:track-1`,
    })

    adapter.destroy()

    expect(adapter.element.getAttribute(`src`)).toBe(null)
  })
})
