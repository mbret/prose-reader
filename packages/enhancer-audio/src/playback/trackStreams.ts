import { mapKeysTo } from "@prose-reader/core"
import { arrayEqual, isShallowEqual } from "@prose-reader/shared"
import {
  combineLatest,
  distinctUntilChanged,
  map,
  type Observable,
  shareReplay,
} from "rxjs"
import type { AudioEnhancerState, AudioTrack } from "../types"
import { isAudioSpineItem } from "../utils"
import type { AudioControllerReader } from "./types"

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

export function createTrackStreams(
  reader: Pick<AudioControllerReader, "context" | "pagination">,
  state$: Observable<AudioEnhancerState>,
) {
  const tracks$ = reader.context.manifest$.pipe(
    map((manifest) =>
      manifest.spineItems.filter(isAudioSpineItem).map((item) => ({
        id: item.id,
        href: item.href,
        index: item.index,
        mediaType: item.mediaType,
      })),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  )

  const pagination$ = reader.pagination.state$.pipe(
    mapKeysTo([`beginSpineItemIndex`, `endSpineItemIndex`]),
    distinctUntilChanged(isShallowEqual),
    shareReplay({ bufferSize: 1, refCount: true }),
  )

  const visibleTrackIds$ = combineLatest([tracks$, pagination$]).pipe(
    map(([tracks, pagination]) =>
      getVisibleTracks(tracks, pagination).map(({ id }) => id),
    ),
    distinctUntilChanged(arrayEqual),
    shareReplay({ bufferSize: 1, refCount: true }),
  )

  const currentTrack$ = state$.pipe(
    map((state) => state.currentTrack),
    distinctUntilChanged(),
  )

  const nextTrack$ = combineLatest([tracks$, pagination$, currentTrack$]).pipe(
    map(([tracks, { endSpineItemIndex }, currentTrack]) => {
      const nextTrackInPaginationWindow =
        currentTrack && endSpineItemIndex !== undefined
          ? tracks.find(
              ({ index }) =>
                index > currentTrack.index && index <= endSpineItemIndex,
            )
          : undefined

      const nextTrackAfterCurrentTrack = getTrackAtSpineItemIndex(
        tracks,
        currentTrack ? currentTrack.index + 1 : undefined,
      )

      return { nextTrackInPaginationWindow, nextTrackAfterCurrentTrack }
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  )

  return {
    tracks$,
    visibleTrackIds$,
    nextTrack$,
  }
}
