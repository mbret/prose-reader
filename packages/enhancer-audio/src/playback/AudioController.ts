import { isDefined, ReactiveEntity } from "@prose-reader/core"
import {
  BehaviorSubject,
  catchError,
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
import { AudioVisualizer } from "../visualizer"
import { AudioElementAdapter } from "./AudioElementAdapter"
import { ResourcesResolver } from "./ResourcesResolver"
import { createTrackStreams } from "./trackStreams"
import type { AudioControllerReader } from "./types"

type SelectCommand = {
  trackId: string
  options: SelectAudioTrackOptions
}

type DesiredPlayback = {
  shouldPlay: boolean
  trackId: string | undefined
}

const initialDesiredPlayback: DesiredPlayback = {
  shouldPlay: false,
  trackId: undefined,
}

const initialState: AudioEnhancerState = {
  tracks: [],
  currentTrack: undefined,
  isPlaying: false,
  isLoading: false,
  hasError: false,
  currentTime: 0,
  duration: undefined,
}

export type { AudioControllerReader }

export class AudioController extends ReactiveEntity<AudioEnhancerState> {
  private readonly reader: AudioControllerReader
  private readonly audio: AudioElementAdapter
  readonly visualizer$: AudioVisualizer
  readonly resourcesResolver = new ResourcesResolver()
  readonly visibleTrackIds$: Observable<string[]>

  private readonly playCommandSubject = new Subject<void>()
  private readonly pauseCommandSubject = new Subject<void>()
  private readonly selectCommandSubject = new Subject<SelectCommand>()
  private readonly desiredPlayback$ = new BehaviorSubject(
    initialDesiredPlayback,
  )
  private readonly subscriptions = new Subscription()

  constructor(
    reader: AudioControllerReader,
    audio = new AudioElementAdapter(),
  ) {
    super(initialState)

    this.reader = reader
    this.audio = audio
    this.visualizer$ = new AudioVisualizer(this.audio.element)

    const { tracks$, visibleTrackIds$, nextTrack$ } = createTrackStreams(
      this.reader,
      this.state$,
    )

    this.visibleTrackIds$ = visibleTrackIds$

    const firstVisibleTrackId$ = this.visibleTrackIds$.pipe(
      map((trackIds) => trackIds[0]),
      distinctUntilChanged(),
      share(),
    )

    const visibleTrackReset$ = firstVisibleTrackId$.pipe(
      withLatestFrom(this.state$),
      filter(
        ([trackId, state]) =>
          trackId === undefined &&
          (state.currentTrack?.id !== undefined || state.isLoading),
      ),
      map(([, state]) => state.tracks),
    )

    const visibleTrackSelectionIntent$ = firstVisibleTrackId$.pipe(
      filter((trackId): trackId is string => trackId !== undefined),
      withLatestFrom(this.desiredPlayback$),
      map(([trackId, { shouldPlay }]) => ({
        trackId,
        options: {
          navigate: false,
          play: shouldPlay ? true : undefined,
        },
      })),
    )

    const tracksChanged$ = tracks$.pipe(
      tap(() => this.resourcesResolver.releaseAll()),
    )

    const playbackReset$ = merge(visibleTrackReset$, tracksChanged$).pipe(
      tap((tracks) => {
        this.emitDesiredPlayback({ shouldPlay: false, trackId: undefined })
        this.visualizer$.stop({ resetLevels: true })
        this.unmountCurrentSource()

        this.mergeCompare({
          tracks,
          currentTrack: undefined,
          isLoading: false,
          isPlaying: false,
          hasError: false,
          currentTime: 0,
          duration: undefined,
        })
        this.visualizer$.reset(undefined)
      }),
      share(),
    )

    const playSelectionIntent$ = this.playCommandSubject.pipe(
      filter(() => !this.audio.hasSource),
      map(() => this.state.currentTrack ?? this.state.tracks[0]),
      filter(isDefined),
      map((track) => ({
        trackId: track.id,
        options: { navigate: false, play: true },
      })),
    )

    const resumePlayback$ = this.playCommandSubject.pipe(
      filter(() => this.audio.hasSource),
      tap(() => {
        this.emitDesiredPlayback({
          shouldPlay: true,
          trackId: this.state.currentTrack?.id,
        })
      }),
    )

    const endedSelectionIntent$ = this.audio.ended$.pipe(
      withLatestFrom(nextTrack$),
      switchMap(
        ([, { nextTrackAfterCurrentTrack, nextTrackInPaginationWindow }]) => {
          this.visualizer$.stop({ resetLevels: true })

          if (nextTrackInPaginationWindow) {
            return of({
              trackId: nextTrackInPaginationWindow.id,
              options: { navigate: false, play: true },
            })
          }

          if (!nextTrackAfterCurrentTrack) {
            this.emitDesiredPlayback({ shouldPlay: false, trackId: undefined })
          }

          this.reader.navigation.goToRightOrBottomSpineItem()

          return EMPTY
        },
      ),
    )

    const selection$ = merge(
      this.selectCommandSubject,
      visibleTrackSelectionIntent$,
      endedSelectionIntent$,
      playSelectionIntent$,
    ).pipe(
      withLatestFrom(this.state$),
      filter(([selectionIntent, state]) =>
        state.tracks.some(({ id }) => id === selectionIntent.trackId),
      ),
      map(([selectionIntent, state]) => ({
        selectionIntent,
        state,
        isReselectionWhileLoading:
          state.currentTrack?.id === selectionIntent.trackId && state.isLoading,
      })),
      tap(({ selectionIntent, state, isReselectionWhileLoading }) => {
        if (selectionIntent.options.navigate !== false) {
          this.reader.navigation.navigate({
            spineItem: selectionIntent.trackId,
            animation: `turn`,
          })
        }

        if (
          isReselectionWhileLoading &&
          selectionIntent.options.play !== undefined
        ) {
          this.emitDesiredPlayback({
            shouldPlay: selectionIntent.options.play,
            trackId: state.currentTrack?.id,
          })
        }
      }),
      filter(({ isReselectionWhileLoading }) => !isReselectionWhileLoading),
      switchMap(({ selectionIntent: { trackId, options } }) =>
        this.selectTrack$({ trackId, options, playbackReset$ }),
      ),
    )

    const playback$ = merge(resumePlayback$, selection$).pipe(
      withLatestFrom(this.desiredPlayback$),
      switchMap(([, { shouldPlay, trackId }]) => {
        if (
          !shouldPlay ||
          !this.audio.hasSource ||
          this.state.currentTrack?.id !== trackId
        ) {
          return EMPTY
        }

        this.mergeCompare({ hasError: false })

        return this.audio.play$().pipe(
          catchError(() => {
            this.mergeCompare({ hasError: true })

            return EMPTY
          }),
        )
      }),
    )

    this.subscriptions.add(playbackReset$.subscribe())
    this.subscriptions.add(playback$.subscribe())

    this.subscriptions.add(
      this.pauseCommandSubject.subscribe(() => {
        this.emitDesiredPlayback({ shouldPlay: false, trackId: undefined })
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

  private resetTrackSelection({
    currentTrack,
    isLoading,
  }: {
    currentTrack: AudioTrack
    isLoading: boolean
  }) {
    this.mergeCompare({
      currentTrack,
      isLoading,
      isPlaying: false,
      hasError: false,
      currentTime: 0,
      duration: undefined,
    })
    this.visualizer$.reset(currentTrack?.id)
  }

  private emitDesiredPlayback({ shouldPlay, trackId }: DesiredPlayback) {
    this.desiredPlayback$.next({
      shouldPlay,
      trackId: shouldPlay ? trackId : undefined,
    })

    if (!shouldPlay) {
      this.audio.pause()
    }
  }

  private unmountCurrentSource() {
    if (!this.audio.hasSource) return

    const trackId = this.state.currentTrack?.id

    if (!this.audio.paused) {
      this.audio.pause()
    }

    this.audio.unloadSource()

    if (trackId) {
      this.resourcesResolver.releaseTrackSource(trackId)
    }
  }

  private mountSource(source: string) {
    this.unmountCurrentSource()
    this.audio.loadSource(source)
  }

  private resolveTrackSource(track: AudioTrack) {
    const spineItem = this.reader.spineItemsManager.get(track.index)

    if (!spineItem) return EMPTY

    return this.resourcesResolver.getTrackResourceUrl$(
      track,
      spineItem.resourcesHandler,
    )
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

    this.emitDesiredPlayback({ shouldPlay, trackId: track.id })

    if (currentTrack?.id === track.id && this.audio.hasSource) {
      this.visualizer$.setTrack(track.id)

      return shouldPlay ? of(undefined) : EMPTY
    }

    this.unmountCurrentSource()

    this.resetTrackSelection({
      currentTrack: track,
      isLoading: true,
    })

    return this.resolveTrackSource(track).pipe(
      map((source) => ({ source })),
      defaultIfEmpty({ source: undefined }),
      catchError(() => of({ source: undefined })),
      takeUntil(playbackReset$),
      tap(({ source }) => {
        if (!source) {
          this.emitDesiredPlayback({ shouldPlay: false, trackId: undefined })
        } else {
          this.mountSource(source)
        }

        this.mergeCompare({ isLoading: false })
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
    this.desiredPlayback$.complete()
    this.visualizer$.destroy()
    this.unmountCurrentSource()
    this.resourcesResolver.destroy()

    super.destroy()
  }
}
