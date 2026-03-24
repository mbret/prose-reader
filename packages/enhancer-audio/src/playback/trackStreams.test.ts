/* @vitest-environment happy-dom */

import type { Reader } from "@prose-reader/core"
import { BehaviorSubject, firstValueFrom } from "rxjs"
import { describe, expect, it } from "vitest"
import type { AudioEnhancerState, AudioTrack } from "../types"
import { createTrackStreams } from "./trackStreams"

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

const createState = (
  overrides: Partial<AudioEnhancerState> = {},
): AudioEnhancerState => ({
  tracks: [],
  currentTrack: undefined,
  isPlaying: false,
  isLoading: false,
  currentTime: 0,
  duration: undefined,
  ...overrides,
})

const createReader = ({
  spineItems = [],
}: {
  spineItems?: Array<ReturnType<typeof createSpineItem>>
} = {}) => {
  const manifest$ = new BehaviorSubject({ spineItems })
  const paginationState$ = new BehaviorSubject<{
    beginSpineItemIndex: number | undefined
    endSpineItemIndex: number | undefined
  }>({
    beginSpineItemIndex: undefined,
    endSpineItemIndex: undefined,
  })

  const reader = {
    context: { manifest$ },
    pagination: { state$: paginationState$ },
  } as unknown as Reader

  return { manifest$, paginationState$, reader }
}

describe(`createTrackStreams`, () => {
  describe(`tracks$`, () => {
    it(`extracts only audio spine items from the manifest`, async () => {
      const { reader } = createReader({
        spineItems: [
          createSpineItem({ id: `audio-1`, index: 0 }),
          createSpineItem({
            id: `chapter-1`,
            index: 1,
            href: `chapter-1.xhtml`,
            mediaType: `application/xhtml+xml`,
          }),
          createSpineItem({ id: `audio-2`, index: 2 }),
        ],
      })
      const state$ = new BehaviorSubject(createState())
      const { tracks$ } = createTrackStreams(reader, state$)

      const tracks = await firstValueFrom(tracks$)

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

    it(`emits new tracks when the manifest changes`, async () => {
      const { reader, manifest$ } = createReader({
        spineItems: [createSpineItem({ id: `track-1`, index: 0 })],
      })
      const state$ = new BehaviorSubject(createState())
      const { tracks$ } = createTrackStreams(reader, state$)

      const emissions: AudioTrack[][] = []
      const sub = tracks$.subscribe((tracks) => emissions.push(tracks))

      manifest$.next({
        spineItems: [
          createSpineItem({ id: `track-a`, index: 0 }),
          createSpineItem({ id: `track-b`, index: 1 }),
        ],
      })

      expect(emissions).toHaveLength(2)
      expect(emissions[1]?.map(({ id }) => id)).toEqual([`track-a`, `track-b`])

      sub.unsubscribe()
    })
  })

  describe(`visibleTrackIds$`, () => {
    it(`returns track IDs at pagination boundaries`, async () => {
      const { reader, paginationState$ } = createReader({
        spineItems: [
          createSpineItem({ id: `track-1`, index: 0 }),
          createSpineItem({ id: `track-2`, index: 1 }),
        ],
      })
      const state$ = new BehaviorSubject(createState())
      const { visibleTrackIds$ } = createTrackStreams(reader, state$)

      const emissions: string[][] = []
      const sub = visibleTrackIds$.subscribe((ids) => emissions.push(ids))

      paginationState$.next({
        beginSpineItemIndex: 0,
        endSpineItemIndex: 1,
      })

      expect(emissions.at(-1)).toEqual([`track-1`, `track-2`])

      sub.unsubscribe()
    })

    it(`deduplicates when begin and end point to the same track`, async () => {
      const { reader, paginationState$ } = createReader({
        spineItems: [createSpineItem({ id: `track-1`, index: 0 })],
      })
      const state$ = new BehaviorSubject(createState())
      const { visibleTrackIds$ } = createTrackStreams(reader, state$)

      const emissions: string[][] = []
      const sub = visibleTrackIds$.subscribe((ids) => emissions.push(ids))

      paginationState$.next({
        beginSpineItemIndex: 0,
        endSpineItemIndex: 0,
      })

      expect(emissions.at(-1)).toEqual([`track-1`])

      sub.unsubscribe()
    })

    it(`returns empty when pagination points to non-audio spine items`, async () => {
      const { reader, paginationState$ } = createReader({
        spineItems: [
          createSpineItem({
            id: `chapter-1`,
            index: 0,
            href: `chapter-1.xhtml`,
            mediaType: `application/xhtml+xml`,
          }),
        ],
      })
      const state$ = new BehaviorSubject(createState())
      const { visibleTrackIds$ } = createTrackStreams(reader, state$)

      const emissions: string[][] = []
      const sub = visibleTrackIds$.subscribe((ids) => emissions.push(ids))

      paginationState$.next({
        beginSpineItemIndex: 0,
        endSpineItemIndex: 0,
      })

      expect(emissions.at(-1)).toEqual([])

      sub.unsubscribe()
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
      const { reader, paginationState$ } = createReader({
        spineItems: [
          createSpineItem({ id: `track-1`, index: 0 }),
          createSpineItem({ id: `track-2`, index: 1 }),
        ],
      })
      const state$ = new BehaviorSubject(createState({ currentTrack: track1 }))
      const { nextTrack$ } = createTrackStreams(reader, state$)

      paginationState$.next({
        beginSpineItemIndex: 0,
        endSpineItemIndex: 1,
      })

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
      const { reader, paginationState$ } = createReader({
        spineItems: [
          createSpineItem({ id: `track-1`, index: 0 }),
          createSpineItem({ id: `track-2`, index: 1 }),
        ],
      })
      const state$ = new BehaviorSubject(createState({ currentTrack: track1 }))
      const { nextTrack$ } = createTrackStreams(reader, state$)

      paginationState$.next({
        beginSpineItemIndex: 0,
        endSpineItemIndex: 0,
      })

      const result = await firstValueFrom(nextTrack$)

      expect(result.nextTrackAfterCurrentTrack?.id).toBe(`track-2`)
      expect(result.nextTrackInPaginationWindow).toBeUndefined()
    })

    it(`returns undefined for both when there is no current track`, async () => {
      const { reader, paginationState$ } = createReader({
        spineItems: [
          createSpineItem({ id: `track-1`, index: 0 }),
          createSpineItem({ id: `track-2`, index: 1 }),
        ],
      })
      const state$ = new BehaviorSubject(createState())
      const { nextTrack$ } = createTrackStreams(reader, state$)

      paginationState$.next({
        beginSpineItemIndex: 0,
        endSpineItemIndex: 1,
      })

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
      const { reader, paginationState$ } = createReader({
        spineItems: [
          createSpineItem({ id: `track-1`, index: 0 }),
          createSpineItem({ id: `track-2`, index: 1 }),
        ],
      })
      const state$ = new BehaviorSubject(createState({ currentTrack: track2 }))
      const { nextTrack$ } = createTrackStreams(reader, state$)

      paginationState$.next({
        beginSpineItemIndex: 1,
        endSpineItemIndex: 1,
      })

      const result = await firstValueFrom(nextTrack$)

      expect(result.nextTrackInPaginationWindow).toBeUndefined()
      expect(result.nextTrackAfterCurrentTrack).toBeUndefined()
    })
  })
})
