/* @vitest-environment happy-dom */

import { firstValueFrom } from "rxjs"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { AudioTrack } from "../types"
import { TrackSourceResolver } from "./TrackSourceResolver"

const createDeferred = <T>() => {
  let resolve: (value: T) => void = () => undefined
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })

  return {
    promise,
    resolve,
  }
}

const createTrack = (): AudioTrack => ({
  id: `track-1`,
  href: `chapter-1.mp3`,
  index: 0,
  mediaType: `audio/mpeg`,
})

const createReader = ({
  getSpineItem,
}: {
  getSpineItem: () =>
    | { resourcesHandler: { getResource: () => unknown } }
    | undefined
}) => {
  const reader = {
    spineItemsManager: {
      get: vi.fn(getSpineItem),
    },
  }

  /**
   * Test double only exposes the reader surface used by TrackSourceResolver.
   */
  return reader as unknown as ConstructorParameters<
    typeof TrackSourceResolver
  >[0]
}

describe(`TrackSourceResolver`, () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * Regression case:
   * - the audio track resolves against an index that currently has no SpineItem
   *
   * This is treated as a legitimate no-op state: the resolver should skip
   * source resolution entirely instead of falling back to another path.
   */
  it(`skips source resolution when the track spine item does not exist`, async () => {
    const track = createTrack()

    const resolver = new TrackSourceResolver(
      createReader({
        getSpineItem: () => undefined,
      }),
      new Set<string>(),
    )

    await expect(
      firstValueFrom(resolver.resolveTrackSource(track)),
    ).rejects.toMatchObject({
      name: `EmptyError`,
    })
  })

  it(`caches response-backed tracks by track id`, async () => {
    const track = createTrack()
    const getResource = vi.fn(
      async () => new Response(new Blob([`audio`], { type: `audio/mpeg` })),
    )
    const createObjectUrl = vi
      .spyOn(URL, `createObjectURL`)
      .mockReturnValue(`blob:track-1`)

    const resolver = new TrackSourceResolver(
      createReader({
        getSpineItem: () => ({
          resourcesHandler: {
            getResource,
          },
        }),
      }),
      new Set<string>(),
    )

    const firstSource = await firstValueFrom(resolver.resolveTrackSource(track))
    const secondSource = await firstValueFrom(
      resolver.resolveTrackSource(track),
    )

    expect(firstSource).toBe(`blob:track-1`)
    expect(secondSource).toBe(`blob:track-1`)
    expect(getResource).toHaveBeenCalledTimes(1)
    expect(createObjectUrl).toHaveBeenCalledTimes(1)
  })

  it(`releases cached object urls when a track is removed`, async () => {
    const track = createTrack()
    const getResource = vi.fn(
      async () => new Response(new Blob([`audio`], { type: `audio/mpeg` })),
    )
    const createObjectUrl = vi
      .spyOn(URL, `createObjectURL`)
      .mockReturnValueOnce(`blob:track-1`)
      .mockReturnValueOnce(`blob:track-1-reloaded`)
    const revokeObjectUrl = vi.spyOn(URL, `revokeObjectURL`)
    const mountedObjectUrls = new Set<string>()

    const resolver = new TrackSourceResolver(
      createReader({
        getSpineItem: () => ({
          resourcesHandler: {
            getResource,
          },
        }),
      }),
      mountedObjectUrls,
    )

    const firstSource = await firstValueFrom(resolver.resolveTrackSource(track))

    resolver.releaseTrackSource(track.id)

    const secondSource = await firstValueFrom(
      resolver.resolveTrackSource(track),
    )

    expect(firstSource).toBe(`blob:track-1`)
    expect(secondSource).toBe(`blob:track-1-reloaded`)
    expect(getResource).toHaveBeenCalledTimes(2)
    expect(createObjectUrl).toHaveBeenCalledTimes(2)
    expect(revokeObjectUrl).toHaveBeenCalledWith(`blob:track-1`)
    expect(mountedObjectUrls.has(`blob:track-1`)).toBe(false)
    expect(mountedObjectUrls.has(`blob:track-1-reloaded`)).toBe(true)
  })

  it(`does not re-cache a released in-flight track source`, async () => {
    const track = createTrack()
    const firstResource = createDeferred<Response>()
    const getResource = vi
      .fn()
      .mockReturnValueOnce(firstResource.promise)
      .mockReturnValueOnce(
        new Response(new Blob([`audio-reloaded`], { type: `audio/mpeg` })),
      )
    const createObjectUrl = vi
      .spyOn(URL, `createObjectURL`)
      .mockReturnValue(`blob:track-1-reloaded`)
    const mountedObjectUrls = new Set<string>()

    const resolver = new TrackSourceResolver(
      createReader({
        getSpineItem: () => ({
          resourcesHandler: {
            getResource,
          },
        }),
      }),
      mountedObjectUrls,
    )

    const firstSourcePromise = firstValueFrom(
      resolver.resolveTrackSource(track),
    )

    resolver.releaseTrackSource(track.id)
    firstResource.resolve(
      new Response(new Blob([`audio`], { type: `audio/mpeg` })),
    )

    await expect(firstSourcePromise).rejects.toMatchObject({
      name: `EmptyError`,
    })

    const secondSource = await firstValueFrom(
      resolver.resolveTrackSource(track),
    )

    expect(secondSource).toBe(`blob:track-1-reloaded`)
    expect(getResource).toHaveBeenCalledTimes(2)
    expect(createObjectUrl).toHaveBeenCalledTimes(1)
    expect(mountedObjectUrls.has(`blob:track-1-reloaded`)).toBe(true)
  })
})
