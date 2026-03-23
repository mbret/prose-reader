/* @vitest-environment happy-dom */

import { BehaviorSubject } from "rxjs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { AudioTrack } from "../types"
import { AudioController } from "./AudioController"

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

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

const createManifestSpineItem = ({
  id = `track-1`,
  href = `${id}.mp3`,
  index = 0,
}: {
  id?: string
  href?: string
  index?: number
} = {}) => ({
  id,
  href,
  index,
  mediaType: `audio/mpeg`,
})

const createUrlResource = (href: string) =>
  new URL(`https://example.com/${href}`)

const getAudioElement = (controller: AudioController) =>
  Reflect.get(controller, `audioElement`) as HTMLAudioElement

const createReader = ({
  spineItems = [],
  spineItemResources = new Map<number, (() => unknown) | undefined>(),
}: {
  spineItems?: Array<ReturnType<typeof createManifestSpineItem>>
  spineItemResources?: Map<number, (() => unknown) | undefined>
} = {}) => {
  const manifest$ = new BehaviorSubject({
    spineItems,
  })
  const paginationState$ = new BehaviorSubject<{
    beginSpineItemIndex: number | undefined
    endSpineItemIndex: number | undefined
  }>({
    beginSpineItemIndex: undefined,
    endSpineItemIndex: undefined,
  })

  for (const spineItem of spineItems) {
    if (!spineItemResources.has(spineItem.index)) {
      spineItemResources.set(spineItem.index, () =>
        createUrlResource(spineItem.href),
      )
    }
  }

  const reader = {
    context: {
      manifest$,
    },
    pagination: {
      state$: paginationState$,
    },
    navigation: {
      navigate: vi.fn(),
      goToRightOrBottomSpineItem: vi.fn(),
    },
    spineItemsManager: {
      get: vi.fn((index: number) => {
        const getResource = spineItemResources.get(index)

        if (!getResource) return undefined

        return {
          resourcesHandler: {
            getResource,
          },
        }
      }),
    },
  }

  return {
    manifest$,
    paginationState$,
    // Test double only exposes the reader surface exercised by AudioController.
    reader: reader as unknown as ConstructorParameters<
      typeof AudioController
    >[0],
  }
}

describe(`AudioController`, () => {
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

  it(`does not resume an in-flight source load after destroy`, async () => {
    const deferredSource = createDeferred<URL>()
    const track = createTrack()
    const { reader } = createReader({
      spineItems: [
        createManifestSpineItem({
          id: track.id,
          href: track.href,
          index: track.index,
        }),
      ],
      spineItemResources: new Map<number, (() => unknown) | undefined>([
        [track.index, () => deferredSource.promise],
      ]),
    })
    const controller = new AudioController(reader)
    const audioElement = getAudioElement(controller)
    const loadSpy = vi.spyOn(audioElement, `load`)

    controller.select(track.id, {
      navigate: false,
      play: true,
    })

    await flush()

    controller.destroy()
    const loadCallsAfterDestroy = loadSpy.mock.calls.length
    const sourceAfterDestroy = audioElement.getAttribute(`src`)

    deferredSource.resolve(createUrlResource(track.href))

    await flush()

    expect(loadSpy).toHaveBeenCalledTimes(loadCallsAfterDestroy)
    expect(audioElement.getAttribute(`src`)).toBe(sourceAfterDestroy)
  })

  it(`resets loading state when manifest updates remove the pending track`, async () => {
    const deferredSource = createDeferred<URL>()
    const { reader, manifest$ } = createReader({
      spineItems: [createManifestSpineItem()],
      spineItemResources: new Map<number, (() => unknown) | undefined>([
        [0, () => deferredSource.promise],
      ]),
    })
    const controller = new AudioController(reader)
    const audioElement = getAudioElement(controller)
    const loadSpy = vi.spyOn(audioElement, `load`)

    controller.select(`track-1`, {
      navigate: false,
      play: true,
    })

    await flush()

    expect(controller.state.isLoading).toBe(true)
    expect(controller.state.currentTrack?.id).toBe(`track-1`)

    manifest$.next({
      spineItems: [],
    })

    await flush()

    expect(controller.state.tracks).toEqual([])
    expect(controller.state.currentTrack).toBeUndefined()
    expect(controller.state.isLoading).toBe(false)
    expect(controller.state.isPlaying).toBe(false)
    expect(audioElement.getAttribute(`src`)).toBe(null)

    const loadCallsAfterManifestReset = loadSpy.mock.calls.length

    deferredSource.resolve(createUrlResource(`track-1.mp3`))

    await flush()

    expect(loadSpy).toHaveBeenCalledTimes(loadCallsAfterManifestReset)
    expect(audioElement.getAttribute(`src`)).toBe(null)
  })

  it(`clears loading state when track source resolution completes without a source`, async () => {
    const { reader } = createReader({
      spineItems: [createManifestSpineItem()],
      spineItemResources: new Map<number, (() => unknown) | undefined>([
        [0, undefined],
      ]),
    })
    const controller = new AudioController(reader)
    const audioElement = getAudioElement(controller)

    controller.select(`track-1`, {
      navigate: false,
      play: true,
    })

    await flush()
    await flush()

    expect(controller.state.currentTrack?.id).toBe(`track-1`)
    expect(controller.state.isLoading).toBe(false)
    expect(controller.state.isPlaying).toBe(false)
    expect(audioElement.getAttribute(`src`)).toBe(null)
  })

  it(`mirrors native duration semantics for unknown and finite values`, async () => {
    const { reader } = createReader()
    const controller = new AudioController(reader)
    const audioElement = getAudioElement(controller)

    Object.defineProperty(audioElement, `duration`, {
      configurable: true,
      get: () => Number.NaN,
    })

    audioElement.dispatchEvent(new Event(`durationchange`))
    await flush()

    expect(controller.state.duration).toBeUndefined()

    Object.defineProperty(audioElement, `duration`, {
      configurable: true,
      get: () => Number.POSITIVE_INFINITY,
    })

    audioElement.dispatchEvent(new Event(`durationchange`))
    await flush()

    expect(controller.state.duration).toBeUndefined()

    Object.defineProperty(audioElement, `duration`, {
      configurable: true,
      get: () => 0,
    })

    audioElement.dispatchEvent(new Event(`durationchange`))
    await flush()

    expect(controller.state.duration).toBe(0)

    Object.defineProperty(audioElement, `duration`, {
      configurable: true,
      get: () => 42.5,
    })

    audioElement.dispatchEvent(new Event(`durationchange`))
    await flush()

    expect(controller.state.duration).toBe(42.5)
  })

  it(`does not create or cache a blob url for a source that was cancelled upstream`, async () => {
    const deferredTrack1Source = createDeferred<Response>()
    const { reader } = createReader({
      spineItems: [
        createManifestSpineItem({
          id: `track-1`,
          index: 0,
        }),
        createManifestSpineItem({
          id: `track-2`,
          index: 1,
        }),
      ],
      spineItemResources: new Map<number, (() => unknown) | undefined>([
        [0, () => deferredTrack1Source.promise],
      ]),
    })
    const controller = new AudioController(reader)
    const audioElement = getAudioElement(controller)
    const createObjectUrl = vi.spyOn(URL, `createObjectURL`)
    const sourceByTrackId = Reflect.get(controller, `sourceByTrackId`) as Map<
      string,
      string
    >

    controller.select(`track-1`, {
      navigate: false,
      play: true,
    })

    await flush()

    controller.select(`track-2`, {
      navigate: false,
      play: true,
    })

    await flush()
    await flush()

    expect(audioElement.getAttribute(`src`)).toBe(
      `https://example.com/track-2.mp3`,
    )

    deferredTrack1Source.resolve(
      new Response(new Blob([`audio-1`], { type: `audio/mpeg` })),
    )

    await flush()
    await flush()

    expect(audioElement.getAttribute(`src`)).toBe(
      `https://example.com/track-2.mp3`,
    )
    expect(createObjectUrl).not.toHaveBeenCalled()
    expect(sourceByTrackId.has(`track-1`)).toBe(false)
  })

  /**
   * Regression test for the auto-advance race reported in review:
   * if page navigation updates pagination synchronously after `ended`,
   * the next visible track can be emitted immediately.
   *
   * This verifies we still capture that first next-track emission and
   * resume playback instead of dropping it and stalling on the ended track.
   */
  it(`auto-advances when pagination updates synchronously on ended`, async () => {
    const { reader, paginationState$ } = createReader({
      spineItems: [
        createManifestSpineItem({
          id: `track-1`,
          index: 0,
        }),
        createManifestSpineItem({
          id: `track-2`,
          index: 1,
        }),
      ],
    })
    const controller = new AudioController(reader)
    const audioElement = getAudioElement(controller)
    const playSpy = vi.spyOn(audioElement, `play`).mockResolvedValue(undefined)

    paginationState$.next({
      beginSpineItemIndex: 0,
      endSpineItemIndex: 0,
    })

    await flush()

    expect(controller.state.currentTrack?.id).toBe(`track-1`)

    vi.mocked(reader.navigation.goToRightOrBottomSpineItem).mockImplementation(
      () => {
        paginationState$.next({
          beginSpineItemIndex: 1,
          endSpineItemIndex: 1,
        })
      },
    )

    audioElement.dispatchEvent(new Event(`ended`))

    await flush()

    audioElement.dispatchEvent(new Event(`canplay`))
    await flush()

    expect(reader.navigation.goToRightOrBottomSpineItem).toHaveBeenCalledTimes(
      1,
    )
    expect(controller.state.currentTrack?.id).toBe(`track-2`)
    expect(playSpy).toHaveBeenCalledTimes(1)
  })

  it(`plays the next visible track in a spread before turning the page`, async () => {
    const { reader, paginationState$ } = createReader({
      spineItems: [
        createManifestSpineItem({
          id: `track-1`,
          index: 0,
        }),
        createManifestSpineItem({
          id: `track-2`,
          index: 1,
        }),
        createManifestSpineItem({
          id: `track-3`,
          index: 2,
        }),
      ],
    })
    const controller = new AudioController(reader)
    const audioElement = getAudioElement(controller)
    const playSpy = vi.spyOn(audioElement, `play`).mockResolvedValue(undefined)

    paginationState$.next({
      beginSpineItemIndex: 0,
      endSpineItemIndex: 1,
    })

    await flush()

    expect(controller.state.currentTrack?.id).toBe(`track-1`)

    audioElement.dispatchEvent(new Event(`ended`))

    await flush()

    audioElement.dispatchEvent(new Event(`canplay`))
    await flush()

    expect(reader.navigation.goToRightOrBottomSpineItem).not.toHaveBeenCalled()
    expect(controller.state.currentTrack?.id).toBe(`track-2`)
    expect(playSpy).toHaveBeenCalledTimes(1)
  })

  it(`does not autoplay after ending the last track and later manual navigation`, async () => {
    const { reader, paginationState$ } = createReader({
      spineItems: [
        createManifestSpineItem({
          id: `track-1`,
          index: 0,
        }),
        createManifestSpineItem({
          id: `track-2`,
          index: 1,
        }),
      ],
    })
    const controller = new AudioController(reader)
    const audioElement = getAudioElement(controller)
    const playSpy = vi.spyOn(audioElement, `play`).mockResolvedValue(undefined)

    paginationState$.next({
      beginSpineItemIndex: 1,
      endSpineItemIndex: 1,
    })

    await flush()

    expect(controller.state.currentTrack?.id).toBe(`track-2`)

    audioElement.dispatchEvent(new Event(`ended`))

    await flush()

    paginationState$.next({
      beginSpineItemIndex: 0,
      endSpineItemIndex: 0,
    })

    await flush()

    audioElement.dispatchEvent(new Event(`canplay`))
    await flush()

    expect(reader.navigation.goToRightOrBottomSpineItem).toHaveBeenCalledTimes(
      1,
    )
    expect(controller.state.currentTrack?.id).toBe(`track-1`)
    expect(playSpy).not.toHaveBeenCalled()
  })

  it(`stops playback when manual navigation moves off audio content`, async () => {
    const { reader, paginationState$ } = createReader({
      spineItems: [
        createManifestSpineItem({
          id: `track-1`,
          index: 0,
        }),
      ],
    })
    const controller = new AudioController(reader)
    const audioElement = getAudioElement(controller)
    const playSpy = vi.spyOn(audioElement, `play`).mockResolvedValue(undefined)
    const pauseSpy = vi.spyOn(audioElement, `pause`)

    paginationState$.next({
      beginSpineItemIndex: 0,
      endSpineItemIndex: 0,
    })

    await flush()

    controller.play()

    await flush()

    audioElement.dispatchEvent(new Event(`play`))
    await flush()

    expect(controller.state.currentTrack?.id).toBe(`track-1`)
    expect(controller.state.isPlaying).toBe(true)
    expect(playSpy).toHaveBeenCalledTimes(1)

    const pauseCallsBeforeNavigation = pauseSpy.mock.calls.length

    paginationState$.next({
      beginSpineItemIndex: 1,
      endSpineItemIndex: 1,
    })

    await flush()

    expect(controller.state.currentTrack).toBeUndefined()
    expect(controller.state.isPlaying).toBe(false)
    expect(audioElement.getAttribute(`src`)).toBe(null)
    expect(pauseSpy).toHaveBeenCalledTimes(pauseCallsBeforeNavigation + 1)
  })

  it(`autoplays the next track after a manual page turn when the current source is already ready`, async () => {
    const { reader, paginationState$ } = createReader({
      spineItems: [
        createManifestSpineItem({
          id: `track-1`,
          index: 0,
        }),
        createManifestSpineItem({
          id: `track-2`,
          index: 1,
        }),
      ],
    })
    const controller = new AudioController(reader)
    const audioElement = getAudioElement(controller)
    const playedSources: string[] = []

    Object.defineProperty(audioElement, `readyState`, {
      configurable: true,
      get: () => HTMLMediaElement.HAVE_FUTURE_DATA,
    })

    vi.spyOn(audioElement, `play`).mockImplementation(() => {
      playedSources.push(audioElement.getAttribute(`src`) ?? ``)

      return Promise.resolve()
    })

    paginationState$.next({
      beginSpineItemIndex: 0,
      endSpineItemIndex: 0,
    })

    await flush()

    controller.play()

    await flush()

    audioElement.dispatchEvent(new Event(`play`))
    await flush()

    playedSources.length = 0

    Object.defineProperty(audioElement, `paused`, {
      configurable: true,
      get: () => false,
    })

    paginationState$.next({
      beginSpineItemIndex: 1,
      endSpineItemIndex: 1,
    })

    await flush()

    expect(controller.state.currentTrack?.id).toBe(`track-2`)
    expect(playedSources).toEqual([`https://example.com/track-2.mp3`])
  })

  it(`releases the previously mounted track source when switching tracks`, async () => {
    const track1: AudioTrack = {
      id: `track-1`,
      href: `chapter-1.mp3`,
      index: 0,
      mediaType: `audio/mpeg`,
    }
    const track2: AudioTrack = {
      id: `track-2`,
      href: `chapter-2.mp3`,
      index: 1,
      mediaType: `audio/mpeg`,
    }

    vi.spyOn(URL, `createObjectURL`)
      .mockReturnValueOnce(`blob:track-1`)
      .mockReturnValueOnce(`blob:track-2`)
    const revokeObjectUrl = vi.spyOn(URL, `revokeObjectURL`)

    const { reader } = createReader({
      spineItems: [
        createManifestSpineItem({
          id: track1.id,
          href: track1.href,
          index: track1.index,
        }),
        createManifestSpineItem({
          id: track2.id,
          href: track2.href,
          index: track2.index,
        }),
      ],
      spineItemResources: new Map<number, (() => unknown) | undefined>([
        [
          track1.index,
          () => new Response(new Blob([`audio-1`], { type: `audio/mpeg` })),
        ],
        [
          track2.index,
          () => new Response(new Blob([`audio-2`], { type: `audio/mpeg` })),
        ],
      ]),
    })
    const controller = new AudioController(reader)

    controller.select(track1.id, {
      navigate: false,
      play: true,
    })

    await flush()
    await flush()

    controller.select(track2.id, {
      navigate: false,
      play: true,
    })

    await flush()
    await flush()

    expect(revokeObjectUrl).toHaveBeenCalledWith(`blob:track-1`)
    expect(revokeObjectUrl).not.toHaveBeenCalledWith(`blob:track-2`)
  })

  it(`releases the mounted track source even when an intermediate selection never loads`, async () => {
    const track1: AudioTrack = {
      id: `track-1`,
      href: `chapter-1.mp3`,
      index: 0,
      mediaType: `audio/mpeg`,
    }
    const track2: AudioTrack = {
      id: `track-2`,
      href: `chapter-2.mp3`,
      index: 1,
      mediaType: `audio/mpeg`,
    }
    const track3: AudioTrack = {
      id: `track-3`,
      href: `chapter-3.mp3`,
      index: 2,
      mediaType: `audio/mpeg`,
    }
    const deferredTrack2Source = createDeferred<Response>()

    vi.spyOn(URL, `createObjectURL`)
      .mockReturnValueOnce(`blob:track-1`)
      .mockReturnValueOnce(`blob:track-3`)
    const revokeObjectUrl = vi.spyOn(URL, `revokeObjectURL`)

    const { reader } = createReader({
      spineItems: [
        createManifestSpineItem({
          id: track1.id,
          href: track1.href,
          index: track1.index,
        }),
        createManifestSpineItem({
          id: track2.id,
          href: track2.href,
          index: track2.index,
        }),
        createManifestSpineItem({
          id: track3.id,
          href: track3.href,
          index: track3.index,
        }),
      ],
      spineItemResources: new Map<number, (() => unknown) | undefined>([
        [
          track1.index,
          () => new Response(new Blob([`audio-1`], { type: `audio/mpeg` })),
        ],
        [track2.index, () => deferredTrack2Source.promise],
        [
          track3.index,
          () => new Response(new Blob([`audio-3`], { type: `audio/mpeg` })),
        ],
      ]),
    })
    const controller = new AudioController(reader)

    controller.select(track1.id, {
      navigate: false,
      play: true,
    })

    await flush()
    await flush()

    controller.select(track2.id, {
      navigate: false,
      play: true,
    })

    await flush()

    controller.select(track3.id, {
      navigate: false,
      play: true,
    })

    await flush()
    await flush()

    expect(revokeObjectUrl).toHaveBeenCalledWith(`blob:track-1`)
    expect(revokeObjectUrl).not.toHaveBeenCalledWith(`blob:track-2`)
  })
})
