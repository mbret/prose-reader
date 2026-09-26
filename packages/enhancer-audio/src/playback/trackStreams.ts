import type { PaginationInfo } from "@prose-reader/core"
import { arrayEqual, isShallowEqual, type Manifest } from "@prose-reader/shared"
import {
  combineLatest,
  distinctUntilChanged,
  map,
  type Observable,
  shareReplay,
} from "rxjs"
import type { AudioEnhancerState, AudioTrack } from "../types"
import { isAudioSpineItem } from "../utils"

type PaginationTrackWindow = {
  beginSpineItemIndex: number | undefined
  endSpineItemIndex: number | undefined
}

const getTrackAtSpineItemIndex = (
  tracks: AudioTrack[],
  index: number | undefined,
) => {
  if (index === undefined) return undefined

  return tracks.find((track) => track.index === index)
}

const getVisibleTracks = (
  tracks: AudioTrack[],
  pagination: PaginationTrackWindow,
) => {
  const beginTrack = getTrackAtSpineItemIndex(
    tracks,
    pagination.beginSpineItemIndex,
  )
  const endTrack = getTrackAtSpineItemIndex(
    tracks,
    pagination.endSpineItemIndex,
  )

  return [beginTrack, endTrack].filter(
    (track, i, arr): track is AudioTrack =>
      track !== undefined && arr.indexOf(track) === i,
  )
}

export const getManifestAudioTracks = (manifest: Manifest): AudioTrack[] =>
  manifest.spineItems
    .filter(isAudioSpineItem)
    .map(({ id, href, index, mediaType }) => ({ id, href, index, mediaType }))

/**
 * Every stream here describes a state rather than an event, so each one
 * replays its current value: a subscriber sees where the reader is, however
 * late it subscribes.
 */
export function createTrackStreams({
  tracks,
  paginationState$,
  state$,
}: {
  tracks: AudioTrack[]
  paginationState$: Observable<PaginationInfo>
  state$: Observable<AudioEnhancerState>
}) {
  /**
   * Only the two item indexes matter here, so they are projected flat and
   * compared as a pair rather than as two edge objects rebuilt every result.
   */
  const pagination$ = paginationState$.pipe(
    map(
      ({ begin, end }): PaginationTrackWindow => ({
        beginSpineItemIndex: begin.spineItemIndex,
        endSpineItemIndex: end.spineItemIndex,
      }),
    ),
    distinctUntilChanged(isShallowEqual),
    shareReplay({ bufferSize: 1, refCount: true }),
  )

  const visibleTrackIds$ = pagination$.pipe(
    map((pagination) =>
      getVisibleTracks(tracks, pagination).map(({ id }) => id),
    ),
    distinctUntilChanged(arrayEqual),
    shareReplay({ bufferSize: 1, refCount: true }),
  )

  const firstVisibleTrackId$ = visibleTrackIds$.pipe(
    map((trackIds) => trackIds[0]),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true }),
  )

  const currentTrack$ = state$.pipe(
    map((state) => state.currentTrack),
    distinctUntilChanged(),
  )

  const nextTrack$ = combineLatest([pagination$, currentTrack$]).pipe(
    map(([{ endSpineItemIndex }, currentTrack]) => {
      const nextTrackInPaginationWindow =
        currentTrack && endSpineItemIndex !== undefined
          ? tracks.find(
              ({ index }) =>
                index > currentTrack.index && index <= endSpineItemIndex,
            )
          : undefined

      const nextTrackAfterCurrentTrack = currentTrack
        ? tracks.find(({ index }) => index > currentTrack.index)
        : undefined

      return { nextTrackInPaginationWindow, nextTrackAfterCurrentTrack }
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  )

  return {
    visibleTrackIds$,
    firstVisibleTrackId$,
    nextTrack$,
  }
}
