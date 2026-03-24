import type { Reader } from "@prose-reader/core"
import { mapKeysTo, ReactiveEntity } from "@prose-reader/core"
import { arrayEqual, isShallowEqual } from "@prose-reader/shared"
import { isDefined } from "reactjrx"
import {
  catchError,
  combineLatest,
  defaultIfEmpty,
  distinctUntilChanged,
  EMPTY,
  filter,
  map,
  merge,
  type Observable,
  of,
  Subject,
  Subscription,
  share,
  shareReplay,
  switchMap,
  takeUntil,
  tap,
  withLatestFrom,
} from "rxjs"
import type {
  AudioEnhancerState,
  AudioTrack,
  SelectAudioTrackOptions,
} from "../types"
import { isAudioSpineItem } from "../utils"
import { AudioVisualizer } from "../visualizer"
import { AudioElementAdapter } from "./AudioElementAdapter"
import { ResourcesResolver } from "./ResourcesResolver"

type SelectCommand = {
  trackId: string
  options: SelectAudioTrackOptions
}

type PaginationTrackWindow = {
  beginSpineItemIndex: number | undefined
  endSpineItemIndex: number | undefined
}

type MountedSource = {
  trackId: string
  source: string
}

const initialState: AudioEnhancerState = {
  tracks: [],
  currentTrack: undefined,
  isPlaying: false,
  isLoading: false,
  currentTime: 0,
  duration: undefined,
}

const getTrackAtSpineItemIndex = (
  tracks: AudioTrack[],
  index: number | undefined,
) => {
  if (index === undefined) return undefined

  return tracks.find((track) => track.index === index)
}

const getPaginationPlaybackTargets = ({
  currentTrack,
  pagination,
  tracks,
}: {
  currentTrack: AudioTrack | undefined
  pagination: PaginationTrackWindow
  tracks: AudioTrack[]
}) => {
  const { endSpineItemIndex } = pagination
  const beginTrack = getTrackAtSpineItemIndex(
    tracks,
    pagination.beginSpineItemIndex,
  )
  const endTrack = getTrackAtSpineItemIndex(
    tracks,
    pagination.endSpineItemIndex,
  )
  const visibleTracks = [beginTrack, endTrack].filter(
    (track, i, arr): track is AudioTrack =>
      track !== undefined && arr.indexOf(track) === i,
  )

  const nextTrackInPaginationWindow =
    currentTrack && endSpineItemIndex !== undefined
      ? tracks.find(
          ({ index }) =>
            index > currentTrack.index && index <= endSpineItemIndex,
        )
      : undefined

  const nextTrackAfterPageTurn = getTrackAtSpineItemIndex(
    tracks,
    currentTrack ? currentTrack.index + 1 : undefined,
  )

  return { visibleTracks, nextTrackInPaginationWindow, nextTrackAfterPageTurn }
}

export class AudioController extends ReactiveEntity<AudioEnhancerState> {
  private readonly reader: Reader
  private readonly audio = new AudioElementAdapter()
  readonly visualizer$: AudioVisualizer
  readonly resourcesResolver = new ResourcesResolver()
  readonly visibleTrackIds$: Observable<string[]>

  private readonly playCommandSubject = new Subject<void>()
  private readonly pauseCommandSubject = new Subject<void>()
  private readonly selectCommandSubject = new Subject<SelectCommand>()
  private readonly subscriptions = new Subscription()

  private mountedSource: MountedSource | undefined
  private desiredPlaybackTrackId: string | undefined
  private shouldPlay = false
  private playbackContinuationTrackId: string | undefined

  constructor(reader: Reader) {
    super(initialState)

    this.reader = reader
    this.visualizer$ = new AudioVisualizer(this.audio.element)

    const playCommand$ = this.playCommandSubject
    const pauseCommand$ = this.pauseCommandSubject
    const userSelect$ = this.selectCommandSubject

    const tracks$ = this.reader.context.manifest$.pipe(
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

    const pagination$ = this.reader.pagination.state$.pipe(
      mapKeysTo([`beginSpineItemIndex`, `endSpineItemIndex`]),
      distinctUntilChanged(isShallowEqual),
      shareReplay({ bufferSize: 1, refCount: true }),
    )

    this.visibleTrackIds$ = combineLatest([tracks$, pagination$]).pipe(
      map(([tracks, pagination]) =>
        getPaginationPlaybackTargets({
          tracks,
          pagination,
          currentTrack: undefined,
        }).visibleTracks.map(({ id }) => id),
      ),
      distinctUntilChanged(arrayEqual),
      shareReplay({ bufferSize: 1, refCount: true }),
    )

    const trackSync$ = tracks$.pipe(
      withLatestFrom(this.state$),
      map(([tracks, state]) => {
        const nextTrackIds = new Set(tracks.map(({ id }) => id))
        const removedTrackIds = state.tracks
          .filter(({ id }) => !nextTrackIds.has(id))
          .map(({ id }) => id)
        const currentTrack =
          state.currentTrack &&
          tracks.find(({ id }) => id === state.currentTrack?.id)
        const shouldResetPlayback =
          state.currentTrack !== undefined && currentTrack === undefined

        return { tracks, currentTrack, removedTrackIds, shouldResetPlayback }
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    )

    const visibleTrackContext$ = this.visibleTrackIds$.pipe(
      map((trackIds) => trackIds[0]),
      distinctUntilChanged(),
      withLatestFrom(this.state$),
      map(([trackId, state]) => {
        const shouldContinuePlayback =
          trackId !== undefined &&
          this.playbackContinuationTrackId === trackId &&
          trackId !== state.currentTrack?.id

        return {
          trackId,
          tracks: state.tracks,
          currentTrackId: state.currentTrack?.id,
          isLoading: state.isLoading,
          shouldContinuePlayback,
        }
      }),
      share(),
    )

    const visibleTrackReset$ = visibleTrackContext$.pipe(
      filter(
        ({ trackId, currentTrackId, isLoading }) =>
          trackId === undefined &&
          !this.playbackContinuationTrackId &&
          (currentTrackId !== undefined || isLoading),
      ),
      map(({ tracks }) => tracks),
    )

    const visibleTrackSelectionIntent$ = visibleTrackContext$.pipe(
      filter(
        (value): value is typeof value & { trackId: string } =>
          value.trackId !== undefined,
      ),
      tap(({ shouldContinuePlayback }) => {
        if (shouldContinuePlayback) {
          this.playbackContinuationTrackId = undefined
        }
      }),
      map(({ trackId, shouldContinuePlayback }) => ({
        trackId,
        options: {
          navigate: false,
          play: shouldContinuePlayback ? true : undefined,
        },
      })),
    )

    const playbackReset$ = merge(
      visibleTrackReset$,
      trackSync$.pipe(
        filter(({ shouldResetPlayback }) => shouldResetPlayback),
        map(({ tracks }) => tracks),
      ),
    ).pipe(share())

    const playSelectionIntent$ = playCommand$.pipe(
      filter(() => !this.hasSource),
      map(() => this.state.currentTrack ?? this.state.tracks[0]),
      filter(isDefined),
      map((track) => ({
        trackId: track.id,
        options: { navigate: false, play: true },
      })),
    )

    const resumePlayback$ = playCommand$.pipe(
      filter(() => this.hasSource),
      tap(() => {
        this.setDesiredPlayback({
          shouldPlay: true,
          trackId: this.state.currentTrack?.id,
        })
      }),
    )

    const endedSelectionIntent$ = this.audio.ended$.pipe(
      withLatestFrom(pagination$),
      switchMap(([, pagination]) => {
        this.visualizer$.stop({ resetLevels: true })

        const { nextTrackAfterPageTurn, nextTrackInPaginationWindow } =
          getPaginationPlaybackTargets({
            tracks: this.state.tracks,
            pagination,
            currentTrack: this.state.currentTrack,
          })

        if (nextTrackInPaginationWindow) {
          this.playbackContinuationTrackId = undefined

          return of({
            trackId: nextTrackInPaginationWindow.id,
            options: { navigate: false, play: true },
          })
        }

        if (nextTrackAfterPageTurn) {
          this.playbackContinuationTrackId = nextTrackAfterPageTurn.id
        } else {
          this.playbackContinuationTrackId = undefined
          this.setDesiredPlayback({ shouldPlay: false, trackId: undefined })
        }

        this.reader.navigation.goToRightOrBottomSpineItem()

        return EMPTY
      }),
    )

    const playbackInterrupted$ = merge(
      playCommand$,
      pauseCommand$,
      playbackReset$.pipe(map(() => undefined)),
      userSelect$.pipe(
        filter(({ options }) => options.navigate !== false),
        map(() => undefined),
      ),
    ).pipe(
      tap(() => {
        this.playbackContinuationTrackId = undefined
      }),
    )

    const selection$ = merge(
      userSelect$,
      visibleTrackSelectionIntent$,
      endedSelectionIntent$,
      playSelectionIntent$,
    ).pipe(
      withLatestFrom(this.state$),
      filter(([selectionIntent, state]) =>
        state.tracks.some(({ id }) => id === selectionIntent.trackId),
      ),
      tap(([selectionIntent, state]) => {
        if (selectionIntent.options.navigate !== false) {
          this.reader.navigation.navigate({
            spineItem: selectionIntent.trackId,
            animation: `turn`,
          })
        }

        if (
          state.currentTrack?.id === selectionIntent.trackId &&
          state.isLoading &&
          selectionIntent.options.play !== undefined
        ) {
          this.setDesiredPlayback({
            shouldPlay: selectionIntent.options.play,
            trackId: state.currentTrack.id,
          })
        }
      }),
      filter(
        ([selectionIntent, state]) =>
          !(
            state.currentTrack?.id === selectionIntent.trackId &&
            state.isLoading
          ),
      ),
      switchMap(([{ trackId, options }]) =>
        this.selectTrack$({ trackId, options, playbackReset$ }),
      ),
    )

    const playback$ = merge(resumePlayback$, selection$).pipe(
      switchMap(() => this.playAudio$()),
    )

    this.subscriptions.add(playbackInterrupted$.subscribe())
    this.subscriptions.add(playback$.subscribe())

    this.subscriptions.add(
      pauseCommand$.subscribe(() => {
        this.setDesiredPlayback({ shouldPlay: false, trackId: undefined })
      }),
    )

    this.subscriptions.add(
      playbackReset$.subscribe((tracks) => {
        this.setDesiredPlayback({ shouldPlay: false, trackId: undefined })
        this.visualizer$.stop({ resetLevels: true })
        this.applyMountedSource(undefined)
        this.mergeCompare({
          tracks,
          currentTrack: undefined,
          isLoading: false,
          isPlaying: false,
          currentTime: 0,
          duration: undefined,
        })
        this.visualizer$.reset(undefined)
      }),
    )

    this.subscriptions.add(
      trackSync$
        .pipe(
          tap(({ removedTrackIds }) => {
            for (const trackId of removedTrackIds) {
              if (trackId === this.mountedSource?.trackId) continue

              this.releaseTrackSource(trackId)
            }
          }),
          filter(({ shouldResetPlayback }) => !shouldResetPlayback),
        )
        .subscribe(({ tracks, currentTrack }) => {
          this.mergeCompare({
            tracks,
            currentTrack,
            isLoading: currentTrack ? this.state.isLoading : false,
            isPlaying: currentTrack ? this.state.isPlaying : false,
            currentTime: currentTrack ? this.state.currentTime : 0,
            duration: currentTrack ? this.state.duration : undefined,
          })
          this.visualizer$.reset(currentTrack?.id)
        }),
    )

    this.subscriptions.add(
      this.audio.isPlaying$.subscribe((isPlaying) => {
        this.mergeCompare({ isPlaying })

        if (!isPlaying) {
          this.visualizer$.stop()
          return
        }

        if (!this.state.currentTrack) return

        this.visualizer$.start(this.state.currentTrack)
      }),
    )

    this.subscriptions.add(
      this.audio.metrics$.subscribe(({ currentTime, duration }) => {
        this.mergeCompare({ currentTime, duration })
      }),
    )
  }

  get state() {
    return this.value
  }

  get visualizer() {
    return this.visualizer$.value
  }

  private get hasSource() {
    return this.mountedSource !== undefined
  }

  private resetTrackSelection({
    currentTrack,
    isLoading,
    isPlaying,
  }: {
    currentTrack: AudioTrack | undefined
    isLoading: boolean
    isPlaying: boolean
  }) {
    this.mergeCompare({
      currentTrack,
      isLoading,
      isPlaying,
      currentTime: 0,
      duration: undefined,
    })
    this.visualizer$.reset(currentTrack?.id)
  }

  private setDesiredPlayback({
    shouldPlay,
    trackId,
  }: {
    shouldPlay: boolean
    trackId: string | undefined
  }) {
    this.shouldPlay = shouldPlay
    this.desiredPlaybackTrackId = shouldPlay ? trackId : undefined

    if (!shouldPlay) {
      this.audio.pause()
    }
  }

  private applyMountedSource(nextMountedSource: MountedSource | undefined) {
    const previousMountedSource = this.mountedSource

    if (
      previousMountedSource?.trackId === nextMountedSource?.trackId &&
      previousMountedSource?.source === nextMountedSource?.source
    ) {
      return
    }

    this.mountedSource = nextMountedSource

    if (previousMountedSource) {
      if (this.shouldPlay) {
        this.audio.pause()
      }

      this.audio.unloadSource()
    }

    if (nextMountedSource) {
      this.audio.loadSource(nextMountedSource.source)
    }

    if (
      previousMountedSource &&
      previousMountedSource.trackId !== nextMountedSource?.trackId
    ) {
      this.releaseTrackSource(previousMountedSource.trackId)
    }
  }

  private playAudio$() {
    if (
      !this.shouldPlay ||
      this.desiredPlaybackTrackId === undefined ||
      this.mountedSource?.trackId !== this.desiredPlaybackTrackId
    ) {
      return EMPTY
    }

    return this.audio.play$()
  }

  private resolveTrackSource(track: AudioTrack) {
    const spineItem = this.reader.spineItemsManager.get(track.index)

    if (!spineItem) return EMPTY

    return this.resourcesResolver.getTrackResourceUrl$(
      track,
      spineItem.resourcesHandler,
    )
  }

  private releaseTrackSource(trackId: string) {
    this.resourcesResolver.releaseTrackSource(trackId)
  }

  private selectTrack$({
    trackId,
    options,
    playbackReset$,
  }: {
    trackId: string
    options: SelectAudioTrackOptions
    playbackReset$: Observable<AudioTrack[]>
  }) {
    const track = this.state.tracks.find(({ id }) => id === trackId)

    if (!track) return EMPTY

    const currentTrack = this.state.currentTrack
    const shouldPlay =
      options.play ?? (!this.audio.paused && currentTrack !== undefined)

    this.setDesiredPlayback({ shouldPlay, trackId: track.id })

    if (currentTrack?.id === track.id && this.hasSource) {
      this.visualizer$.setTrack(track.id)

      return shouldPlay ? of(undefined) : EMPTY
    }

    this.resetTrackSelection({
      currentTrack: track,
      isLoading: true,
      isPlaying: false,
    })

    return this.resolveTrackSource(track).pipe(
      map((source) => ({ source })),
      defaultIfEmpty({ source: undefined }),
      catchError(() => of({ source: undefined })),
      takeUntil(playbackReset$),
      tap(({ source }) => {
        if (!source) {
          this.setDesiredPlayback({ shouldPlay: false, trackId: undefined })
          this.applyMountedSource(undefined)
        } else {
          this.applyMountedSource({ trackId: track.id, source })
        }

        this.resetTrackSelection({
          currentTrack: track,
          isLoading: false,
          isPlaying: false,
        })
      }),
      filter(({ source }) => source !== undefined),
      map(() => undefined),
    )
  }

  select(trackId: string, options: SelectAudioTrackOptions = {}) {
    this.selectCommandSubject.next({ trackId, options })
  }

  play() {
    this.playCommandSubject.next()
  }

  pause() {
    this.pauseCommandSubject.next()
  }

  toggle() {
    if (this.audio.paused) {
      this.play()
      return
    }

    this.pause()
  }

  setCurrentTime(value: number) {
    this.mergeCompare({ currentTime: value })
    this.audio.setCurrentTime(value)
  }

  destroy() {
    this.subscriptions.unsubscribe()
    this.playCommandSubject.complete()
    this.pauseCommandSubject.complete()
    this.selectCommandSubject.complete()
    this.visualizer$.destroy()
    this.setDesiredPlayback({ shouldPlay: false, trackId: undefined })
    this.applyMountedSource(undefined)
    this.resourcesResolver.destroy()

    super.destroy()
  }
}
