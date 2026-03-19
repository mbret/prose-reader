import {
  combineLatest,
  distinctUntilChanged,
  map,
  type Observable,
  shareReplay,
} from "rxjs"
import type { AudioTrack } from "../types"
import {
  getPaginationPlaybackTargets,
  type PaginationTrackWindow,
} from "./playbackTargetPolicy"

const areTrackIdsEqual = (previous: string[], next: string[]) => {
  return (
    previous.length === next.length &&
    previous.every((trackId, index) => trackId === next[index])
  )
}

/**
 * Resolves the audio track ids anchored to the current pagination window.
 *
 * Important: this intentionally tracks only the pagination boundaries
 * (`beginSpineItemIndex` and `endSpineItemIndex`), not every spine item that
 * could happen to be visible inside that range.
 *
 * The audio enhancer uses this stream to know which audio page is the current
 * pagination target, so the emitted ids should stay aligned with pagination
 * edges rather than "all currently visible items".
 */
export const createVisibleTrackIds$ = (
  tracks$: Observable<AudioTrack[]>,
  readerPaginationState$: Observable<PaginationTrackWindow>,
) => {
  return combineLatest([
    tracks$,
    readerPaginationState$.pipe(
      map(({ beginSpineItemIndex, endSpineItemIndex }) => ({
        beginSpineItemIndex,
        endSpineItemIndex,
      })),
      distinctUntilChanged(
        (previous, next) =>
          previous.beginSpineItemIndex === next.beginSpineItemIndex &&
          previous.endSpineItemIndex === next.endSpineItemIndex,
      ),
    ),
  ]).pipe(
    map(([tracks, pagination]) =>
      getPaginationPlaybackTargets({
        tracks,
        pagination,
        currentTrack: undefined,
      }).visibleTracks.map(({ id }) => id),
    ),
    distinctUntilChanged(areTrackIdsEqual),
    shareReplay(1),
  )
}
