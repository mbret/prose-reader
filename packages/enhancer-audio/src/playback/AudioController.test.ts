/* @vitest-environment happy-dom */

import { BehaviorSubject, EMPTY, of, Subject } from "rxjs"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { AudioTrack } from "../types"

const { releaseTrackSourceMock, resolveTrackSourceMock } = vi.hoisted(() => ({
  releaseTrackSourceMock: vi.fn(),
  resolveTrackSourceMock: vi.fn(),
}))

vi.mock("./TrackSourceResolver", () => ({
  TrackSourceResolver: class {
    resolveTrackSource = resolveTrackSourceMock
    releaseTrackSource = releaseTrackSourceMock
    destroy = vi.fn()
  },
}))

import { AudioController } from "./AudioController"

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

const getAudioElement = (controller: AudioController) =>
  (
    Reflect.get(controller, `audioElementAdapter`) as {
      element: HTMLAudioElement
    }
  ).element

const createReader = ({
  spineItems = [],
}: {
  spineItems?: Array<ReturnType<typeof createManifestSpineItem>>
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
      get: vi.fn(() => undefined),
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
    releaseTrackSourceMock.mockReset()
    resolveTrackSourceMock.mockReset()
    vi.spyOn(HTMLMediaElement.prototype, `pause`).mockImplementation(
      () => undefined,
    )
    vi.spyOn(HTMLMediaElement.prototype, `load`).mockImplementation(
      () => undefined,
    )
  })

  it(`does not resume an in-flight source load after destroy`, async () => {
    const deferredSource = new Subject<string>()

    resolveTrackSourceMock.mockReturnValue(deferredSource.asObservable())

    const { reader } = createReader()
    const controller = new AudioController(reader)
    const track = createTrack()
    const audioElement = getAudioElement(controller)
    const loadSpy = vi.spyOn(audioElement, `load`)

    controller.setTracks([track])
    controller.select(track.id, {
      navigate: false,
      play: true,
    })

    await Promise.resolve()

    controller.destroy()
    const loadCallsAfterDestroy = loadSpy.mock.calls.length
    const sourceAfterDestroy = audioElement.getAttribute(`src`)
    deferredSource.next(`blob:late-source`)
    deferredSource.complete()

    await Promise.resolve()

    expect(loadSpy).toHaveBeenCalledTimes(loadCallsAfterDestroy)
    expect(audioElement.getAttribute(`src`)).toBe(sourceAfterDestroy)
  })

  it(`resets loading state when manifest updates remove the pending track`, async () => {
    const deferredSource = new Subject<string>()

    resolveTrackSourceMock.mockReturnValue(deferredSource.asObservable())

    const { reader, manifest$ } = createReader({
      spineItems: [createManifestSpineItem()],
    })
    const controller = new AudioController(reader)
    const audioElement = getAudioElement(controller)
    const loadSpy = vi.spyOn(audioElement, `load`)

    controller.select(`track-1`, {
      navigate: false,
      play: true,
    })

    await Promise.resolve()

    expect(controller.state.isLoading).toBe(true)
    expect(controller.state.currentTrack?.id).toBe(`track-1`)

    manifest$.next({
      spineItems: [],
    })

    await Promise.resolve()

    expect(controller.state.tracks).toEqual([])
    expect(controller.state.currentTrack).toBeUndefined()
    expect(controller.state.isLoading).toBe(false)
    expect(controller.state.isPlaying).toBe(false)
    expect(audioElement.getAttribute(`src`)).toBe(null)

    const loadCallsAfterManifestReset = loadSpy.mock.calls.length
    deferredSource.next(`blob:late-source`)
    deferredSource.complete()

    await Promise.resolve()

    expect(loadSpy).toHaveBeenCalledTimes(loadCallsAfterManifestReset)
    expect(audioElement.getAttribute(`src`)).toBe(null)
  })

  it(`clears loading state when track source resolution completes without a source`, async () => {
    resolveTrackSourceMock.mockReturnValue(EMPTY)

    const { reader } = createReader({
      spineItems: [createManifestSpineItem()],
    })
    const controller = new AudioController(reader)
    const audioElement = getAudioElement(controller)

    controller.select(`track-1`, {
      navigate: false,
      play: true,
    })

    await Promise.resolve()
    await Promise.resolve()

    expect(controller.state.currentTrack?.id).toBe(`track-1`)
    expect(controller.state.isLoading).toBe(false)
    expect(controller.state.isPlaying).toBe(false)
    expect(audioElement.getAttribute(`src`)).toBe(null)
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
    resolveTrackSourceMock.mockImplementation((track: AudioTrack) =>
      of(`blob:${track.id}`),
    )

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

    await Promise.resolve()
    await Promise.resolve()

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

    await Promise.resolve()
    await Promise.resolve()

    audioElement.dispatchEvent(new Event(`canplay`))
    await Promise.resolve()

    expect(reader.navigation.goToRightOrBottomSpineItem).toHaveBeenCalledTimes(
      1,
    )
    expect(controller.state.currentTrack?.id).toBe(`track-2`)
    expect(playSpy).toHaveBeenCalledTimes(1)
  })

  it(`plays the next visible track in a spread before turning the page`, async () => {
    resolveTrackSourceMock.mockImplementation((track: AudioTrack) =>
      of(`blob:${track.id}`),
    )

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

    await Promise.resolve()
    await Promise.resolve()

    expect(controller.state.currentTrack?.id).toBe(`track-1`)

    audioElement.dispatchEvent(new Event(`ended`))

    await Promise.resolve()
    await Promise.resolve()

    audioElement.dispatchEvent(new Event(`canplay`))
    await Promise.resolve()

    expect(reader.navigation.goToRightOrBottomSpineItem).not.toHaveBeenCalled()
    expect(controller.state.currentTrack?.id).toBe(`track-2`)
    expect(playSpy).toHaveBeenCalledTimes(1)
  })

  it(`does not autoplay after ending the last track and later manual navigation`, async () => {
    resolveTrackSourceMock.mockImplementation((track: AudioTrack) =>
      of(`blob:${track.id}`),
    )

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

    await Promise.resolve()
    await Promise.resolve()

    expect(controller.state.currentTrack?.id).toBe(`track-2`)

    audioElement.dispatchEvent(new Event(`ended`))

    await Promise.resolve()
    await Promise.resolve()

    paginationState$.next({
      beginSpineItemIndex: 0,
      endSpineItemIndex: 0,
    })

    await Promise.resolve()
    await Promise.resolve()

    audioElement.dispatchEvent(new Event(`canplay`))
    await Promise.resolve()

    expect(reader.navigation.goToRightOrBottomSpineItem).toHaveBeenCalledTimes(
      1,
    )
    expect(controller.state.currentTrack?.id).toBe(`track-1`)
    expect(playSpy).not.toHaveBeenCalled()
  })

  it(`stops playback when manual navigation moves off audio content`, async () => {
    resolveTrackSourceMock.mockImplementation((track: AudioTrack) =>
      of(`blob:${track.id}`),
    )

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

    await Promise.resolve()
    await Promise.resolve()

    controller.play()

    await Promise.resolve()
    await Promise.resolve()

    audioElement.dispatchEvent(new Event(`canplay`))
    audioElement.dispatchEvent(new Event(`play`))

    await Promise.resolve()

    expect(controller.state.currentTrack?.id).toBe(`track-1`)
    expect(controller.state.isPlaying).toBe(true)
    expect(playSpy).toHaveBeenCalledTimes(1)

    const pauseCallsBeforeNavigation = pauseSpy.mock.calls.length

    paginationState$.next({
      beginSpineItemIndex: 1,
      endSpineItemIndex: 1,
    })

    await Promise.resolve()
    await Promise.resolve()

    expect(controller.state.currentTrack).toBeUndefined()
    expect(controller.state.isPlaying).toBe(false)
    expect(audioElement.getAttribute(`src`)).toBe(null)
    expect(pauseSpy).toHaveBeenCalledTimes(pauseCallsBeforeNavigation + 1)
  })

  it(`autoplays the next track after a manual page turn when the current source is already ready`, async () => {
    resolveTrackSourceMock.mockImplementation((track: AudioTrack) =>
      of(`blob:${track.id}`),
    )

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

    await Promise.resolve()
    await Promise.resolve()

    controller.play()

    await Promise.resolve()
    await Promise.resolve()

    audioElement.dispatchEvent(new Event(`play`))
    await Promise.resolve()

    playedSources.length = 0

    Object.defineProperty(audioElement, `paused`, {
      configurable: true,
      get: () => false,
    })

    paginationState$.next({
      beginSpineItemIndex: 1,
      endSpineItemIndex: 1,
    })

    await Promise.resolve()
    await Promise.resolve()

    expect(controller.state.currentTrack?.id).toBe(`track-2`)
    expect(playedSources).toEqual([`blob:track-2`])
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

    resolveTrackSourceMock.mockImplementation((track: AudioTrack) =>
      of(`blob:${track.id}`),
    )

    const { reader } = createReader()
    const controller = new AudioController(reader)

    controller.setTracks([track1, track2])
    controller.select(track1.id, {
      navigate: false,
      play: true,
    })

    await Promise.resolve()

    controller.select(track2.id, {
      navigate: false,
      play: true,
    })

    await Promise.resolve()

    expect(releaseTrackSourceMock).toHaveBeenCalledWith(`track-1`)
    expect(releaseTrackSourceMock).not.toHaveBeenCalledWith(`track-2`)
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
    const deferredTrack2Source = new Subject<string>()

    resolveTrackSourceMock.mockImplementation((track: AudioTrack) => {
      if (track.id === `track-2`) {
        return deferredTrack2Source.asObservable()
      }

      return of(`blob:${track.id}`)
    })

    const { reader } = createReader()
    const controller = new AudioController(reader)

    controller.setTracks([track1, track2, track3])
    controller.select(track1.id, {
      navigate: false,
      play: true,
    })

    await Promise.resolve()

    controller.select(track2.id, {
      navigate: false,
      play: true,
    })

    await Promise.resolve()

    controller.select(track3.id, {
      navigate: false,
      play: true,
    })

    await Promise.resolve()

    expect(releaseTrackSourceMock).toHaveBeenCalledWith(`track-1`)
    expect(releaseTrackSourceMock).not.toHaveBeenCalledWith(`track-2`)
  })
})
