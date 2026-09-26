/* @vitest-environment happy-dom */

import type { PaginationEdge, PaginationInfo } from "@prose-reader/core"
import type { Manifest } from "@prose-reader/shared"
import { BehaviorSubject, firstValueFrom } from "rxjs"
import { describe, expect, it } from "vitest"
import type { AudioEnhancerState, AudioTrack } from "../types"
import { createTrackStreams, getManifestAudioTracks } from "./trackStreams"

const createSpineItem = ({
  id,
  href,
  index,
  mediaType = `audio/mpeg`,
}: {
  id: string
  href?: string
  index: number
  mediaType?: string
}) => ({
  id,
  href: href ?? `${id}.mp3`,
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

const createPaginationEdge = (
  spineItemIndex: number | undefined,
): PaginationEdge => ({
  cfi: undefined,
  spineItemIndex,
  pageIndexInSpineItem: undefined,
  numberOfPagesInSpineItem: 0,
})

const createPaginationState = ({
  beginSpineItemIndex,
  endSpineItemIndex,
}: {
  beginSpineItemIndex: number | undefined
  endSpineItemIndex: number | undefined
}): PaginationInfo => ({
  isSettled: false,
  begin: createPaginationEdge(beginSpineItemIndex),
  end: createPaginationEdge(endSpineItemIndex),
})

const createState = (
  overrides: Partial<AudioEnhancerState> = {},
): AudioEnhancerState => ({
  tracks: [],
  currentTrack: undefined,
  isPlaying: false,
  isLoading: false,
  currentTime: 0,
  duration: undefined,
  hasError: false,
  ...overrides,
})

const createStreams = ({
  spineItems = [],
  state = createState(),
}: {
  spineItems?: Manifest["spineItems"]
  state?: AudioEnhancerState
} = {}) => {
  const paginationState$ = new BehaviorSubject(
    createPaginationState({
      beginSpineItemIndex: undefined,
      endSpineItemIndex: undefined,
    }),
  )

  const streams = createTrackStreams({
    tracks: getManifestAudioTracks(createManifest(spineItems)),
    paginationState$,
    state$: new BehaviorSubject(state),
  })

  return { paginationState$, ...streams }
}

describe(`getManifestAudioTracks`, () => {
  it(`extracts only audio spine items from the manifest`, () => {
    const tracks = getManifestAudioTracks(
      createManifest([
        createSpineItem({ id: `audio-1`, index: 0 }),
        createSpineItem({
          id: `chapter-1`,
          index: 1,
          href: `chapter-1.xhtml`,
          mediaType: `application/xhtml+xml`,
        }),
        createSpineItem({ id: `audio-2`, index: 2 }),
      ]),
    )

    expect(tracks).toEqual([
      {
        id: `audio-1`,
        href: `audio-1.mp3`,
        index: 0,
        mediaType: `audio/mpeg`,
      },
      {
        id: `audio-2`,
        href: `audio-2.mp3`,
        index: 2,
        mediaType: `audio/mpeg`,
      },
    ])
  })
})

describe(`createTrackStreams`, () => {
  describe(`visibleTrackIds$`, () => {
    it(`returns track IDs at pagination boundaries`, async () => {
      const { paginationState$, visibleTrackIds$ } = createStreams({
        spineItems: [
          createSpineItem({ id: `track-1`, index: 0 }),
          createSpineItem({ id: `track-2`, index: 1 }),
        ],
      })

      const emissions: string[][] = []
      const sub = visibleTrackIds$.subscribe((ids) => emissions.push(ids))

      paginationState$.next(
        createPaginationState({
          beginSpineItemIndex: 0,
          endSpineItemIndex: 1,
        }),
      )

      expect(emissions.at(-1)).toEqual([`track-1`, `track-2`])

      sub.unsubscribe()
    })

    it(`deduplicates when begin and end point to the same track`, async () => {
      const { paginationState$, visibleTrackIds$ } = createStreams({
        spineItems: [createSpineItem({ id: `track-1`, index: 0 })],
      })

      const emissions: string[][] = []
      const sub = visibleTrackIds$.subscribe((ids) => emissions.push(ids))

      paginationState$.next(
        createPaginationState({
          beginSpineItemIndex: 0,
          endSpineItemIndex: 0,
        }),
      )

      expect(emissions.at(-1)).toEqual([`track-1`])

      sub.unsubscribe()
    })

    it(`returns empty when pagination points to non-audio spine items`, async () => {
      const { paginationState$, visibleTrackIds$ } = createStreams({
        spineItems: [
          createSpineItem({
            id: `chapter-1`,
            index: 0,
            href: `chapter-1.xhtml`,
            mediaType: `application/xhtml+xml`,
          }),
        ],
      })

      const emissions: string[][] = []
      const sub = visibleTrackIds$.subscribe((ids) => emissions.push(ids))

      paginationState$.next(
        createPaginationState({
          beginSpineItemIndex: 0,
          endSpineItemIndex: 0,
        }),
      )

      expect(emissions.at(-1)).toEqual([])

      sub.unsubscribe()
    })
  })

  describe(`firstVisibleTrackId$`, () => {
    it(`starts every subscriber on the current track, however late it subscribes`, () => {
      const { paginationState$, firstVisibleTrackId$ } = createStreams({
        spineItems: [
          createSpineItem({ id: `track-1`, index: 0 }),
          createSpineItem({ id: `track-2`, index: 1 }),
        ],
      })

      paginationState$.next(
        createPaginationState({
          beginSpineItemIndex: 1,
          endSpineItemIndex: 1,
        }),
      )

      const firstSubscriberTrackIds: Array<string | undefined> = []
      const laterSubscriberTrackIds: Array<string | undefined> = []
      const firstSub = firstVisibleTrackId$.subscribe((trackId) =>
        firstSubscriberTrackIds.push(trackId),
      )
      const laterSub = firstVisibleTrackId$.subscribe((trackId) =>
        laterSubscriberTrackIds.push(trackId),
      )

      paginationState$.next(
        createPaginationState({
          beginSpineItemIndex: 0,
          endSpineItemIndex: 0,
        }),
      )

      expect(firstSubscriberTrackIds).toEqual([`track-2`, `track-1`])
      expect(laterSubscriberTrackIds).toEqual([`track-2`, `track-1`])

      firstSub.unsubscribe()
      laterSub.unsubscribe()
    })
  })

  describe(`nextTrack$`, () => {
    it(`returns the next track within the pagination window`, async () => {
      const track1: AudioTrack = {
        id: `track-1`,
        href: `track-1.mp3`,
        index: 0,
        mediaType: `audio/mpeg`,
      }
      const { paginationState$, nextTrack$ } = createStreams({
        spineItems: [
          createSpineItem({ id: `track-1`, index: 0 }),
          createSpineItem({ id: `track-2`, index: 1 }),
        ],
        state: createState({ currentTrack: track1 }),
      })

      paginationState$.next(
        createPaginationState({
          beginSpineItemIndex: 0,
          endSpineItemIndex: 1,
        }),
      )

      const result = await firstValueFrom(nextTrack$)

      expect(result.nextTrackInPaginationWindow?.id).toBe(`track-2`)
    })

    it(`returns the next track after current regardless of pagination`, async () => {
      const track1: AudioTrack = {
        id: `track-1`,
        href: `track-1.mp3`,
        index: 0,
        mediaType: `audio/mpeg`,
      }
      const { paginationState$, nextTrack$ } = createStreams({
        spineItems: [
          createSpineItem({ id: `track-1`, index: 0 }),
          createSpineItem({ id: `track-2`, index: 1 }),
        ],
        state: createState({ currentTrack: track1 }),
      })

      paginationState$.next(
        createPaginationState({
          beginSpineItemIndex: 0,
          endSpineItemIndex: 0,
        }),
      )

      const result = await firstValueFrom(nextTrack$)

      expect(result.nextTrackAfterCurrentTrack?.id).toBe(`track-2`)
      expect(result.nextTrackInPaginationWindow).toBeUndefined()
    })

    it(`returns undefined for both when there is no current track`, async () => {
      const { paginationState$, nextTrack$ } = createStreams({
        spineItems: [
          createSpineItem({ id: `track-1`, index: 0 }),
          createSpineItem({ id: `track-2`, index: 1 }),
        ],
      })

      paginationState$.next(
        createPaginationState({
          beginSpineItemIndex: 0,
          endSpineItemIndex: 1,
        }),
      )

      const result = await firstValueFrom(nextTrack$)

      expect(result.nextTrackInPaginationWindow).toBeUndefined()
      expect(result.nextTrackAfterCurrentTrack).toBeUndefined()
    })

    it(`returns undefined when current track is the last one`, async () => {
      const track2: AudioTrack = {
        id: `track-2`,
        href: `track-2.mp3`,
        index: 1,
        mediaType: `audio/mpeg`,
      }
      const { paginationState$, nextTrack$ } = createStreams({
        spineItems: [
          createSpineItem({ id: `track-1`, index: 0 }),
          createSpineItem({ id: `track-2`, index: 1 }),
        ],
        state: createState({ currentTrack: track2 }),
      })

      paginationState$.next(
        createPaginationState({
          beginSpineItemIndex: 1,
          endSpineItemIndex: 1,
        }),
      )

      const result = await firstValueFrom(nextTrack$)

      expect(result.nextTrackInPaginationWindow).toBeUndefined()
      expect(result.nextTrackAfterCurrentTrack).toBeUndefined()
    })
  })
})
