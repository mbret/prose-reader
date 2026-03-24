/* @vitest-environment happy-dom */

import type { PaginationInfo, ResourceHandler } from "@prose-reader/core"
import type { Manifest } from "@prose-reader/shared"
import { BehaviorSubject } from "rxjs"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { AudioTrack } from "../types"
import { AudioController } from "./AudioController"
import { AudioElementAdapter } from "./AudioElementAdapter"

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
  mediaType = `audio/mpeg`,
}: {
  id?: string
  href?: string
  index?: number
  mediaType?: string
} = {}) => ({
  id,
  href,
  index,
  mediaType,
})

const createManifest = (spineItems: Manifest["spineItems"] = []): Manifest => ({
  filename: ``,
  title: ``,
  renditionLayout: undefined,
  renditionSpread: undefined,
  readingDirection: `ltr`,
  spineItems,
  items: [],
})

const createPaginationState = ({
  beginSpineItemIndex,
  endSpineItemIndex,
}: Pick<
  PaginationInfo,
  "beginSpineItemIndex" | "endSpineItemIndex"
>): PaginationInfo => ({
  beginPageIndexInSpineItem: undefined,
  beginNumberOfPagesInSpineItem: 0,
  beginCfi: undefined,
  beginSpineItemIndex,
  endPageIndexInSpineItem: undefined,
  endNumberOfPagesInSpineItem: 0,
  endCfi: undefined,
  endSpineItemIndex,
})

const createUrlResource = (href: string) =>
  new URL(`https://example.com/${href}`)

const createAudio = () => {
  const audio = new AudioElementAdapter()
  const pauseSpy = vi
    .spyOn(audio.element, `pause`)
    .mockImplementation(() => undefined)
  const loadSpy = vi
    .spyOn(audio.element, `load`)
    .mockImplementation(() => undefined)

  return { audio, pauseSpy, loadSpy }
}

const createReader = ({
  spineItems = [],
  spineItemResources = new Map<
    number,
    ResourceHandler["getResource"] | undefined
  >(),
}: {
  spineItems?: Array<ReturnType<typeof createManifestSpineItem>>
  spineItemResources?: Map<number, ResourceHandler["getResource"] | undefined>
} = {}) => {
  const manifest$ = new BehaviorSubject(createManifest(spineItems))
  const paginationState$ = new BehaviorSubject(
    createPaginationState({
      beginSpineItemIndex: undefined,
      endSpineItemIndex: undefined,
    }),
  )

  for (const spineItem of spineItems) {
    if (!spineItemResources.has(spineItem.index)) {
      spineItemResources.set(spineItem.index, async () =>
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
    reader,
  }
}

describe(`AudioController`, () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it(`populates tracks from the initial manifest on construction`, () => {
    const { reader } = createReader({
      spineItems: [createManifestSpineItem()],
    })
    const { audio } = createAudio()
    const controller = new AudioController(reader, audio)

    expect(controller.state.tracks).toEqual([
      {
        id: `track-1`,
        href: `track-1.mp3`,
        index: 0,
        mediaType: `audio/mpeg`,
      },
    ])
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
      spineItemResources: new Map<
        number,
        ResourceHandler["getResource"] | undefined
      >([[track.index, () => deferredSource.promise]]),
    })
    const { audio, loadSpy } = createAudio()
    const controller = new AudioController(reader, audio)

    controller.select(track.id, {
      navigate: false,
      play: true,
    })

    await flush()

    controller.destroy()
    const loadCallsAfterDestroy = loadSpy.mock.calls.length
    const sourceAfterDestroy = audio.element.getAttribute(`src`)

    deferredSource.resolve(createUrlResource(track.href))

    await flush()

    expect(loadSpy).toHaveBeenCalledTimes(loadCallsAfterDestroy)
    expect(audio.element.getAttribute(`src`)).toBe(sourceAfterDestroy)
  })

  it(`resets loading state when manifest updates remove the pending track`, async () => {
    const deferredSource = createDeferred<URL>()
    const { reader, manifest$ } = createReader({
      spineItems: [createManifestSpineItem()],
      spineItemResources: new Map<
        number,
        ResourceHandler["getResource"] | undefined
      >([[0, () => deferredSource.promise]]),
    })
    const { audio, loadSpy } = createAudio()
    const controller = new AudioController(reader, audio)

    controller.select(`track-1`, {
      navigate: false,
      play: true,
    })

    await flush()

    expect(controller.state.isLoading).toBe(true)
    expect(controller.state.currentTrack?.id).toBe(`track-1`)

    manifest$.next(createManifest([]))

    await flush()

    expect(controller.state.tracks).toEqual([])
    expect(controller.state.currentTrack).toBeUndefined()
    expect(controller.state.isLoading).toBe(false)
    expect(controller.state.isPlaying).toBe(false)
    expect(audio.element.getAttribute(`src`)).toBe(null)

    const loadCallsAfterManifestReset = loadSpy.mock.calls.length

    deferredSource.resolve(createUrlResource(`track-1.mp3`))

    await flush()

    expect(loadSpy).toHaveBeenCalledTimes(loadCallsAfterManifestReset)
    expect(audio.element.getAttribute(`src`)).toBe(null)
  })

  it(`clears loading state when track source resolution completes without a source`, async () => {
    const { reader } = createReader({
      spineItems: [createManifestSpineItem()],
      spineItemResources: new Map<
        number,
        ResourceHandler["getResource"] | undefined
      >([[0, undefined]]),
    })
    const { audio } = createAudio()
    const controller = new AudioController(reader, audio)

    controller.select(`track-1`, {
      navigate: false,
      play: true,
    })

    await flush()
    await flush()

    expect(controller.state.currentTrack?.id).toBe(`track-1`)
    expect(controller.state.isLoading).toBe(false)
    expect(controller.state.isPlaying).toBe(false)
    expect(audio.element.getAttribute(`src`)).toBe(null)
  })

  it(`does not restart source resolution when play is pressed again for the same loading track`, async () => {
    const deferredSource = createDeferred<URL>()
    const getResource = vi.fn(() => deferredSource.promise)
    const { reader } = createReader({
      spineItems: [createManifestSpineItem()],
      spineItemResources: new Map<
        number,
        ResourceHandler["getResource"] | undefined
      >([[0, getResource]]),
    })
    const { audio } = createAudio()
    const controller = new AudioController(reader, audio)

    controller.select(`track-1`, {
      navigate: false,
      play: true,
    })

    await flush()

    expect(controller.state.currentTrack?.id).toBe(`track-1`)
    expect(controller.state.isLoading).toBe(true)
    expect(getResource).toHaveBeenCalledTimes(1)

    controller.play()

    await flush()

    expect(controller.state.currentTrack?.id).toBe(`track-1`)
    expect(controller.state.isLoading).toBe(true)
    expect(getResource).toHaveBeenCalledTimes(1)

    deferredSource.resolve(createUrlResource(`track-1.mp3`))

    await flush()
    await flush()

    expect(controller.state.isLoading).toBe(false)
  })

  it(`does not restart or cancel source resolution when selecting the same loading track again`, async () => {
    const deferredSource = createDeferred<URL>()
    const getResource = vi.fn(() => deferredSource.promise)
    const { reader } = createReader({
      spineItems: [createManifestSpineItem()],
      spineItemResources: new Map<
        number,
        ResourceHandler["getResource"] | undefined
      >([[0, getResource]]),
    })
    const { audio } = createAudio()
    const controller = new AudioController(reader, audio)

    controller.select(`track-1`, {
      navigate: false,
      play: true,
    })

    await flush()

    expect(controller.state.currentTrack?.id).toBe(`track-1`)
    expect(controller.state.isLoading).toBe(true)
    expect(getResource).toHaveBeenCalledTimes(1)

    controller.select(`track-1`, {
      navigate: false,
    })

    await flush()

    expect(controller.state.currentTrack?.id).toBe(`track-1`)
    expect(controller.state.isLoading).toBe(true)
    expect(getResource).toHaveBeenCalledTimes(1)

    deferredSource.resolve(createUrlResource(`track-1.mp3`))

    await flush()
    await flush()

    expect(controller.state.isLoading).toBe(false)
  })

  it(`mirrors native duration semantics for unknown and finite values`, async () => {
    const { reader } = createReader()
    const { audio } = createAudio()
    const controller = new AudioController(reader, audio)

    Object.defineProperty(audio.element, `duration`, {
      configurable: true,
      get: () => Number.NaN,
    })

    audio.element.dispatchEvent(new Event(`durationchange`))
    await flush()

    expect(controller.state.duration).toBeUndefined()

    Object.defineProperty(audio.element, `duration`, {
      configurable: true,
      get: () => Number.POSITIVE_INFINITY,
    })

    audio.element.dispatchEvent(new Event(`durationchange`))
    await flush()

    expect(controller.state.duration).toBeUndefined()

    Object.defineProperty(audio.element, `duration`, {
      configurable: true,
      get: () => 0,
    })

    audio.element.dispatchEvent(new Event(`durationchange`))
    await flush()

    expect(controller.state.duration).toBe(0)

    Object.defineProperty(audio.element, `duration`, {
      configurable: true,
      get: () => 42.5,
    })

    audio.element.dispatchEvent(new Event(`durationchange`))
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
      spineItemResources: new Map<
        number,
        ResourceHandler["getResource"] | undefined
      >([[0, () => deferredTrack1Source.promise]]),
    })
    const { audio } = createAudio()
    const controller = new AudioController(reader, audio)
    const createObjectUrl = vi.spyOn(URL, `createObjectURL`)

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

    expect(audio.element.getAttribute(`src`)).toBe(
      `https://example.com/track-2.mp3`,
    )

    deferredTrack1Source.resolve(
      new Response(new Blob([`audio-1`], { type: `audio/mpeg` })),
    )

    await flush()
    await flush()

    expect(audio.element.getAttribute(`src`)).toBe(
      `https://example.com/track-2.mp3`,
    )
    expect(createObjectUrl).not.toHaveBeenCalled()
    expect(
      controller.resourcesResolver.cachedSourceByTrackId.has(`track-1`),
    ).toBe(false)
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
    const { audio } = createAudio()
    const controller = new AudioController(reader, audio)
    const playSpy = vi.spyOn(audio.element, `play`).mockResolvedValue(undefined)

    paginationState$.next(
      createPaginationState({
        beginSpineItemIndex: 0,
        endSpineItemIndex: 0,
      }),
    )

    await flush()

    expect(controller.state.currentTrack?.id).toBe(`track-1`)

    controller.play()
    await flush()

    playSpy.mockClear()

    vi.mocked(reader.navigation.goToRightOrBottomSpineItem).mockImplementation(
      () => {
        paginationState$.next(
          createPaginationState({
            beginSpineItemIndex: 1,
            endSpineItemIndex: 1,
          }),
        )
      },
    )

    audio.element.dispatchEvent(new Event(`ended`))

    await flush()

    audio.element.dispatchEvent(new Event(`canplay`))
    await flush()

    expect(reader.navigation.goToRightOrBottomSpineItem).toHaveBeenCalledTimes(
      1,
    )
    expect(controller.state.currentTrack?.id).toBe(`track-2`)
    expect(playSpy).toHaveBeenCalledTimes(1)
  })

  it(`auto-advances across non-contiguous audio spine indices`, async () => {
    const { reader, paginationState$ } = createReader({
      spineItems: [
        createManifestSpineItem({
          id: `track-1`,
          index: 0,
        }),
        createManifestSpineItem({
          id: `text-1`,
          href: `text-1.xhtml`,
          index: 1,
          mediaType: `application/xhtml+xml`,
        }),
        createManifestSpineItem({
          id: `track-2`,
          index: 2,
        }),
      ],
    })
    const { audio } = createAudio()
    const controller = new AudioController(reader, audio)
    const playSpy = vi.spyOn(audio.element, `play`).mockResolvedValue(undefined)

    paginationState$.next(
      createPaginationState({
        beginSpineItemIndex: 0,
        endSpineItemIndex: 0,
      }),
    )

    await flush()

    expect(controller.state.currentTrack?.id).toBe(`track-1`)

    controller.play()
    await flush()

    playSpy.mockClear()

    vi.mocked(reader.navigation.goToRightOrBottomSpineItem).mockImplementation(
      () => {
        paginationState$.next(
          createPaginationState({
            beginSpineItemIndex: 2,
            endSpineItemIndex: 2,
          }),
        )
      },
    )

    audio.element.dispatchEvent(new Event(`ended`))

    await flush()

    audio.element.dispatchEvent(new Event(`canplay`))
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
    const { audio } = createAudio()
    const controller = new AudioController(reader, audio)
    const playSpy = vi.spyOn(audio.element, `play`).mockResolvedValue(undefined)

    paginationState$.next(
      createPaginationState({
        beginSpineItemIndex: 0,
        endSpineItemIndex: 1,
      }),
    )

    await flush()

    expect(controller.state.currentTrack?.id).toBe(`track-1`)

    audio.element.dispatchEvent(new Event(`ended`))

    await flush()

    audio.element.dispatchEvent(new Event(`canplay`))
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
    const { audio } = createAudio()
    const controller = new AudioController(reader, audio)
    const playSpy = vi.spyOn(audio.element, `play`).mockResolvedValue(undefined)

    paginationState$.next(
      createPaginationState({
        beginSpineItemIndex: 1,
        endSpineItemIndex: 1,
      }),
    )

    await flush()

    expect(controller.state.currentTrack?.id).toBe(`track-2`)

    audio.element.dispatchEvent(new Event(`ended`))

    await flush()

    paginationState$.next(
      createPaginationState({
        beginSpineItemIndex: 0,
        endSpineItemIndex: 0,
      }),
    )

    await flush()

    audio.element.dispatchEvent(new Event(`canplay`))
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
    const { audio, pauseSpy } = createAudio()
    const controller = new AudioController(reader, audio)
    const playSpy = vi.spyOn(audio.element, `play`).mockResolvedValue(undefined)

    paginationState$.next(
      createPaginationState({
        beginSpineItemIndex: 0,
        endSpineItemIndex: 0,
      }),
    )

    await flush()

    controller.play()

    await flush()

    audio.element.dispatchEvent(new Event(`play`))
    await flush()

    expect(controller.state.currentTrack?.id).toBe(`track-1`)
    expect(controller.state.isPlaying).toBe(true)
    expect(playSpy).toHaveBeenCalledTimes(1)

    const pauseCallsBeforeNavigation = pauseSpy.mock.calls.length

    paginationState$.next(
      createPaginationState({
        beginSpineItemIndex: 1,
        endSpineItemIndex: 1,
      }),
    )

    await flush()

    expect(controller.state.currentTrack).toBeUndefined()
    expect(controller.state.isPlaying).toBe(false)
    expect(audio.element.getAttribute(`src`)).toBe(null)
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
    const { audio } = createAudio()
    const controller = new AudioController(reader, audio)
    const playedSources: string[] = []

    Object.defineProperty(audio.element, `readyState`, {
      configurable: true,
      get: () => HTMLMediaElement.HAVE_FUTURE_DATA,
    })

    vi.spyOn(audio.element, `play`).mockImplementation(() => {
      playedSources.push(audio.element.getAttribute(`src`) ?? ``)

      return Promise.resolve()
    })

    paginationState$.next(
      createPaginationState({
        beginSpineItemIndex: 0,
        endSpineItemIndex: 0,
      }),
    )

    await flush()

    controller.play()

    await flush()

    audio.element.dispatchEvent(new Event(`play`))
    await flush()

    playedSources.length = 0

    Object.defineProperty(audio.element, `paused`, {
      configurable: true,
      get: () => false,
    })

    paginationState$.next(
      createPaginationState({
        beginSpineItemIndex: 1,
        endSpineItemIndex: 1,
      }),
    )

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
      spineItemResources: new Map<
        number,
        ResourceHandler["getResource"] | undefined
      >([
        [
          track1.index,
          async () =>
            new Response(new Blob([`audio-1`], { type: `audio/mpeg` })),
        ],
        [
          track2.index,
          async () =>
            new Response(new Blob([`audio-2`], { type: `audio/mpeg` })),
        ],
      ]),
    })
    const { audio } = createAudio()
    const controller = new AudioController(reader, audio)

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
      spineItemResources: new Map<
        number,
        ResourceHandler["getResource"] | undefined
      >([
        [
          track1.index,
          async () =>
            new Response(new Blob([`audio-1`], { type: `audio/mpeg` })),
        ],
        [track2.index, () => deferredTrack2Source.promise],
        [
          track3.index,
          async () =>
            new Response(new Blob([`audio-3`], { type: `audio/mpeg` })),
        ],
      ]),
    })
    const { audio } = createAudio()
    const controller = new AudioController(reader, audio)

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
