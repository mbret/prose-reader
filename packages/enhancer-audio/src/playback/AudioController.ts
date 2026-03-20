import { ReactiveEntity, type Reader } from "@prose-reader/core"
import {
  catchError,
  defaultIfEmpty,
  defer,
  distinctUntilChanged,
  EMPTY,
  filter,
  from,
  fromEvent,
  map,
  merge,
  type Observable,
  of,
  Subject,
  Subscription,
  switchMap,
  take,
  takeUntil,
  tap,
  withLatestFrom,
} from "rxjs"
import type {
  AudioEnhancerState,
  AudioTrack,
  AudioVisualizerState,
  SelectAudioTrackOptions,
} from "../types"
import { isAudioSpineItem } from "../utils"
import { AudioVisualizer, getIdleVisualizerLevels } from "../visualizer"
import {
  getPaginationPlaybackTargets,
  type PaginationTrackWindow,
} from "./playbackTargetPolicy"
import { TrackSourceResolver } from "./TrackSourceResolver"
import { createVisibleTrackIds$ } from "./visibleTrackId"

const getTrackIndexFromReference = ({
  tracks,
  track,
}: {
  tracks: AudioTrack[]
  track: AudioTrack | number | string
}) => {
  if (typeof track === `number`) {
    return tracks.findIndex(
      ({ index }, playlistIndex) => index === track || playlistIndex === track,
    )
  }

  if (typeof track === `string`) {
    return tracks.findIndex(({ id }) => id === track)
  }

  return tracks.findIndex(({ id }) => id === track.id)
}

type SelectCommand = {
  track: AudioTrack | number | string
  options: SelectAudioTrackOptions
}

export class AudioController extends ReactiveEntity<AudioEnhancerState> {
  private readonly audioElement = document.createElement(`audio`)
  readonly visualizer$ = new AudioVisualizer(this.audioElement)
  readonly visibleTrackIds$: Observable<string[]>
  private readonly mountedObjectUrls = new Set<string>()
  private audioElementSourceTrackId: string | undefined
  private readonly playCommandSubject = new Subject<void>()
  private readonly playWhenReadySubject = new Subject<void>()
  private readonly cancelPlayWhenReadySubject = new Subject<void>()
  private readonly pauseCommandSubject = new Subject<void>()
  private readonly selectCommandSubject = new Subject<SelectCommand>()
  private readonly playbackResetSubject = new Subject<void>()
  private readonly subscriptions = new Subscription()
  private readonly audioElementEventsController = new AbortController()
  private playbackContinuationTrackId: string | undefined
  private readonly reader: Reader
  private readonly trackSourceResolver: TrackSourceResolver

  constructor(reader: Reader) {
    super({
      tracks: [],
      currentTrack: undefined,
      isPlaying: false,
      isLoading: false,
      currentTime: 0,
      duration: 0,
    })
    this.reader = reader
    this.trackSourceResolver = new TrackSourceResolver(
      reader,
      this.mountedObjectUrls,
    )
    this.visibleTrackIds$ = createVisibleTrackIds$(
      this.watch(`tracks`),
      this.reader.pagination.state$,
    )
    this.audioElement.preload = `metadata`
    this.bindAudioElementEvents()
    this.bindControllerEvents()
    this.bindReaderEvents()
  }

  get state() {
    return this.value
  }

  get visualizer() {
    return this.visualizer$.value
  }

  update(value: Partial<AudioEnhancerState>) {
    this.mergeCompare(value)
  }

  setTracks(tracks: AudioTrack[]) {
    const nextTrackIds = new Set(tracks.map(({ id }) => id))

    for (const { id } of this.state.tracks) {
      if (!nextTrackIds.has(id)) {
        this.trackSourceResolver.releaseTrackSource(id)
      }
    }

    const currentTrack =
      this.state.currentTrack &&
      tracks.find(({ id }) => id === this.state.currentTrack?.id)

    if (!currentTrack) {
      this.playbackResetSubject.next()
      this.visualizer$.stop({
        resetLevels: true,
      })
      this.releaseTrackSourceIfInactive(this.resetAudioElementSource())
    }

    this.update({
      tracks,
      currentTrack,
      isLoading: currentTrack ? this.state.isLoading : false,
      isPlaying: currentTrack ? this.state.isPlaying : false,
      currentTime: currentTrack ? this.state.currentTime : 0,
      duration: currentTrack ? this.state.duration : 0,
    })
    this.syncVisualizer({
      trackId: currentTrack?.id,
      isActive: false,
      levels: getIdleVisualizerLevels(),
    })
  }

  select(
    track: AudioTrack | number | string,
    options: SelectAudioTrackOptions = {},
  ) {
    this.selectCommandSubject.next({
      track,
      options,
    })
  }

  play() {
    this.playCommandSubject.next()
  }

  pause() {
    this.pauseCommandSubject.next()
  }

  toggle() {
    if (this.audioElement.paused) {
      this.play()
      return
    }

    this.pause()
  }

  setCurrentTime(value: number) {
    this.update({
      currentTime: value,
    })
    this.audioElement.currentTime = value
  }

  destroy() {
    this.playbackResetSubject.next()
    this.subscriptions.unsubscribe()
    this.audioElementEventsController.abort()
    this.playCommandSubject.complete()
    this.playWhenReadySubject.complete()
    this.cancelPlayWhenReadySubject.complete()
    this.pauseCommandSubject.complete()
    this.selectCommandSubject.complete()
    this.playbackResetSubject.complete()
    this.visualizer$.destroy()
    this.resetAudioElementSource()
    this.trackSourceResolver.destroy()

    super.destroy()
  }

  private bindControllerEvents() {
    const playbackInterrupted$ = merge(
      this.pauseCommandSubject,
      this.playbackResetSubject,
      this.selectCommandSubject.pipe(
        filter(({ options }) => options.navigate !== false),
        map(() => undefined),
      ),
    )

    const playWhenReadyCanceled$ = merge(
      playbackInterrupted$,
      this.cancelPlayWhenReadySubject,
    )

    this.subscriptions.add(
      playbackInterrupted$.subscribe(() => {
        this.clearPlaybackContinuation()
      }),
    )

    this.subscriptions.add(
      this.playCommandSubject.subscribe(() => {
        this.clearPlaybackContinuation()
        this.handlePlayCommand()
      }),
    )

    this.subscriptions.add(
      this.pauseCommandSubject.subscribe(() => {
        this.audioElement.pause()
      }),
    )

    this.subscriptions.add(
      this.playWhenReadySubject
        .pipe(
          switchMap(() =>
            defer(() => {
              if (
                this.audioElement.readyState >=
                HTMLMediaElement.HAVE_FUTURE_DATA
              ) {
                return of(undefined)
              }

              return fromEvent(this.audioElement, `canplay`).pipe(take(1))
            }).pipe(
              takeUntil(playWhenReadyCanceled$),
              switchMap(() => from(this.audioElement.play())),
              catchError(() => EMPTY),
            ),
          ),
        )
        .subscribe(),
    )

    const selectionIntent$ = merge(
      this.selectCommandSubject,
      this.createVisibleTrackSelectionIntent$(),
      this.createEndedSelectionIntent$(),
    )

    this.subscriptions.add(
      selectionIntent$
        .pipe(
          withLatestFrom(this.state$),
          map(([{ track, options }, state]) => ({
            options,
            trackIndex: getTrackIndexFromReference({
              tracks: state.tracks,
              track,
            }),
          })),
          filter(({ trackIndex }) => trackIndex >= 0),
          switchMap(({ trackIndex, options }) =>
            this.selectTrackByIndex$(trackIndex, options),
          ),
        )
        .subscribe(),
    )
  }

  private bindReaderEvents() {
    this.subscriptions.add(
      this.reader.context.manifest$
        .pipe(
          map((manifest) =>
            manifest.spineItems.filter(isAudioSpineItem).map((item) => ({
              id: item.id,
              href: item.href,
              index: item.index,
              mediaType: item.mediaType,
            })),
          ),
        )
        .subscribe((tracks) => {
          this.setTracks(tracks)
        }),
    )
  }

  private createVisibleTrackSelectionIntent$(): Observable<SelectCommand> {
    return this.visibleTrackIds$.pipe(
      map((trackIds) => trackIds[0]),
      distinctUntilChanged(),
      switchMap((trackId) =>
        defer(() => {
          if (trackId === undefined) {
            if (!this.playbackContinuationTrackId) {
              this.stopCurrentTrack()
            }

            return EMPTY
          }

          const shouldContinuePlayback =
            this.playbackContinuationTrackId === trackId &&
            trackId !== this.state.currentTrack?.id

          if (shouldContinuePlayback) {
            this.clearPlaybackContinuation()
          }

          return of({
            track: trackId,
            options: {
              navigate: false,
              play: shouldContinuePlayback ? true : undefined,
            },
          })
        }),
      ),
    )
  }

  private stopCurrentTrack() {
    if (!this.state.currentTrack && !this.state.isLoading) {
      return
    }

    this.playbackResetSubject.next()
    this.resetVisualizerState(undefined)
    this.releaseTrackSourceIfInactive(this.resetAudioElementSource())
    this.resetTrackPlaybackState({
      currentTrack: undefined,
      isLoading: false,
      isPlaying: false,
    })
  }

  private syncVisualizer(value: Partial<AudioVisualizerState>) {
    this.visualizer$.update({
      trackId: this.state.currentTrack?.id,
      ...value,
    })
  }

  private resetTrackPlaybackState({
    currentTrack,
    isLoading,
    isPlaying,
  }: {
    currentTrack: AudioTrack | undefined
    isLoading: boolean
    isPlaying?: boolean
  }) {
    this.update({
      currentTrack,
      isLoading,
      ...(isPlaying !== undefined ? { isPlaying } : undefined),
      currentTime: 0,
      duration: 0,
    })
  }

  private resetVisualizerState(trackId: string | undefined) {
    this.visualizer$.stop({
      resetLevels: true,
    })
    this.syncVisualizer({
      trackId,
      levels: getIdleVisualizerLevels(),
    })
  }

  private selectTrackByIndex$(
    trackIndex: number,
    options: SelectAudioTrackOptions = {},
  ) {
    return defer(() => {
      const track = this.state.tracks[trackIndex]

      if (!track) return EMPTY

      if (options.navigate !== false) {
        this.reader.navigation.navigate({
          spineItem: track.index,
          animation: `turn`,
        })
      }

      const currentTrack = this.state.currentTrack
      const shouldPlay =
        options.play ??
        (!this.audioElement.paused && currentTrack !== undefined)

      if (currentTrack?.id === track.id && this.audioElement.src) {
        if (shouldPlay) {
          this.requestPlayWhenReady()
        } else {
          this.cancelPlayWhenReady()
        }

        this.syncVisualizer({
          trackId: track.id,
        })

        return EMPTY
      }

      if (!shouldPlay) {
        this.cancelPlayWhenReady()

        if (currentTrack?.id !== track.id) {
          this.releaseTrackSourceIfInactive(
            this.resetAudioElementSource(),
            track.id,
          )
        }

        this.resetTrackPlaybackState({
          currentTrack: track,
          isLoading: false,
          isPlaying: false,
        })
        this.resetVisualizerState(track.id)

        return EMPTY
      }

      this.resetTrackPlaybackState({
        currentTrack: track,
        isLoading: true,
      })
      this.resetVisualizerState(track.id)

      return this.trackSourceResolver.resolveTrackSource(track).pipe(
        map((source) => ({ hasSource: true as const, source })),
        defaultIfEmpty({ hasSource: false as const }),
        catchError(() => {
          return of({ hasSource: false as const })
        }),
        takeUntil(this.playbackResetSubject),
        tap((resolution) => {
          if (resolution.hasSource) {
            this.releaseTrackSourceIfInactive(
              this.resetAudioElementSource(),
              track.id,
            )
            this.audioElement.src = resolution.source
            this.audioElementSourceTrackId = track.id
            this.audioElement.load()
            this.requestPlayWhenReady()

            this.resetTrackPlaybackState({
              currentTrack: track,
              isLoading: false,
              isPlaying: false,
            })
            this.resetVisualizerState(track.id)

            return
          }

          this.cancelPlayWhenReady()
          this.releaseTrackSourceIfInactive(
            this.resetAudioElementSource(),
            track.id,
          )
          this.resetTrackPlaybackState({
            currentTrack: track,
            isLoading: false,
            isPlaying: false,
          })
          this.resetVisualizerState(track.id)
        }),
      )
    })
  }

  private cancelPlayWhenReady() {
    this.cancelPlayWhenReadySubject.next()
  }

  private requestPlayWhenReady() {
    this.playWhenReadySubject.next()
  }

  private requestPlaybackContinuation(trackId: string) {
    this.playbackContinuationTrackId = trackId
  }

  private clearPlaybackContinuation() {
    this.playbackContinuationTrackId = undefined
  }

  private getPaginationPlaybackTargets(pagination: PaginationTrackWindow) {
    return getPaginationPlaybackTargets({
      tracks: this.state.tracks,
      pagination,
      currentTrack: this.state.currentTrack,
    })
  }

  private releaseTrackSourceIfInactive(
    trackId: string | undefined,
    activeTrackId?: string,
  ) {
    if (!trackId || trackId === activeTrackId) return

    this.trackSourceResolver.releaseTrackSource(trackId)
  }

  private handlePlayCommand() {
    if (!this.audioElement.src) {
      const initialTrack = this.state.currentTrack ?? this.state.tracks[0]

      if (!initialTrack) return

      const trackIndex = this.state.tracks.findIndex(
        ({ id }) => id === initialTrack.id,
      )

      if (trackIndex < 0) return

      this.selectCommandSubject.next({
        track: trackIndex,
        options: {
          navigate: false,
          play: true,
        },
      })

      return
    }

    this.requestPlayWhenReady()
  }

  private bindAudioElementEvents() {
    const signal = this.audioElementEventsController.signal

    this.audioElement.addEventListener(`play`, this.handlePlay, {
      signal,
    })
    this.audioElement.addEventListener(`pause`, this.handlePause, {
      signal,
    })
    this.audioElement.addEventListener(`timeupdate`, this.syncPlaybackState, {
      signal,
    })
    this.audioElement.addEventListener(`seeking`, this.syncPlaybackState, {
      signal,
    })
    this.audioElement.addEventListener(`seeked`, this.syncPlaybackState, {
      signal,
    })
    this.audioElement.addEventListener(
      `loadedmetadata`,
      this.syncPlaybackState,
      {
        signal,
      },
    )
    this.audioElement.addEventListener(
      `durationchange`,
      this.syncPlaybackState,
      {
        signal,
      },
    )
    this.audioElement.addEventListener(`canplay`, this.syncPlaybackState, {
      signal,
    })
  }

  private createEndedSelectionIntent$(): Observable<SelectCommand> {
    return fromEvent(this.audioElement, `ended`).pipe(
      withLatestFrom(this.reader.pagination.state$),
      switchMap(([, pagination]) =>
        defer(() => {
          this.visualizer$.stop({
            resetLevels: true,
          })

          const { nextTrackAfterPageTurn, nextTrackInPaginationWindow } =
            this.getPaginationPlaybackTargets(pagination)

          if (nextTrackInPaginationWindow) {
            this.clearPlaybackContinuation()

            return of({
              track: nextTrackInPaginationWindow.id,
              options: {
                navigate: false,
                play: true,
              },
            })
          }

          if (nextTrackAfterPageTurn) {
            this.requestPlaybackContinuation(nextTrackAfterPageTurn.id)
          } else {
            this.clearPlaybackContinuation()
          }

          this.reader.navigation.goToRightOrBottomSpineItem()

          return EMPTY
        }),
      ),
    )
  }

  private getPlaybackDuration() {
    if (
      Number.isFinite(this.audioElement.duration) &&
      this.audioElement.duration > 0
    ) {
      return this.audioElement.duration
    }

    const seekableRangeCount = this.audioElement.seekable.length

    if (seekableRangeCount > 0) {
      const seekableDuration = this.audioElement.seekable.end(
        seekableRangeCount - 1,
      )

      if (Number.isFinite(seekableDuration) && seekableDuration > 0) {
        return seekableDuration
      }
    }

    return 0
  }

  private resetAudioElementSource() {
    const trackId = this.audioElementSourceTrackId

    this.audioElement.pause()
    this.audioElement.removeAttribute(`src`)
    this.audioElement.load()
    this.audioElementSourceTrackId = undefined

    return trackId
  }

  private readonly handlePlay = () => {
    this.update({
      isPlaying: true,
    })
    this.visualizer$.start(this.state.currentTrack)
  }

  private readonly handlePause = () => {
    this.update({
      isPlaying: false,
    })
    this.visualizer$.stop()
  }

  private readonly syncPlaybackState = () => {
    this.update({
      currentTime: this.audioElement.currentTime,
      duration: this.getPlaybackDuration(),
    })
  }
}
