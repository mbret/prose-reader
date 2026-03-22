import type { AudioTrack } from "../types"

export type PaginationTrackWindow = {
  beginSpineItemIndex: number | undefined
  endSpineItemIndex: number | undefined
}

const isUniqueDefinedTrack = (
  track: AudioTrack | undefined,
  index: number,
  values: Array<AudioTrack | undefined>,
): track is AudioTrack => {
  return track !== undefined && values.indexOf(track) === index
}

export const getTrackAtSpineItemIndex = ({
  index,
  tracks,
}: {
  index: number | undefined
  tracks: AudioTrack[]
}) => {
  if (index === undefined) return undefined

  return tracks.find((track) => track.index === index)
}

export const getPaginationPlaybackTargets = ({
  currentTrack,
  pagination,
  tracks,
}: {
  currentTrack: AudioTrack | undefined
  pagination: PaginationTrackWindow
  tracks: AudioTrack[]
}) => {
  const endSpineItemIndex = pagination.endSpineItemIndex
  const visibleTracks = [
    getTrackAtSpineItemIndex({
      tracks,
      index: pagination.beginSpineItemIndex,
    }),
    getTrackAtSpineItemIndex({
      tracks,
      index: pagination.endSpineItemIndex,
    }),
  ].filter(isUniqueDefinedTrack)
  const nextTrackInPaginationWindow =
    currentTrack && endSpineItemIndex !== undefined
      ? tracks.find(
          ({ index }) =>
            index > currentTrack.index && index <= endSpineItemIndex,
        )
      : undefined
  const nextTrackAfterPageTurn = getTrackAtSpineItemIndex({
    tracks,
    index: currentTrack ? currentTrack.index + 1 : undefined,
  })

  return {
    visibleTracks,
    activePaginationTrack: visibleTracks[0],
    nextTrackInPaginationWindow,
    nextTrackAfterPageTurn,
  }
}
