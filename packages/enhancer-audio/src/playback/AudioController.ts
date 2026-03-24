import { ReactiveEntity } from "@prose-reader/core"
import { isDefined } from "reactjrx"
import {
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
  private readonly subscriptions = new Subscription()

  private mountedSource: MountedSource | undefined
  private desiredPlaybackTrackId: string | undefined
  private shouldPlay = false
  private playbackContinuationTrackId: string | undefined

  constructor(
    reader: AudioControllerReader,
    audio = new AudioElementAdapter(),
  ) {
    super(initialState)

    this.reader = reader
    this.audio = audio
    this.visualizer$ = new AudioVisualizer(this.audio.element)

    const playCommand$ = this.playCommandSubject
    const pauseCommand$ = this.pauseCommandSubject
    const userSelect$ = this.selectCommandSubject

    const { tracks$, visibleTrackIds$, nextTrack$ } = createTrackStreams(
      this.reader,
      this.state$,
    )

    this.visibleTrackIds$ = visibleTrackIds$

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

    const playbackReset$ = merge(visibleTrackReset$, tracks$).pipe(share())

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
      withLatestFrom(nextTrack$),
      switchMap(
        ([, { nextTrackAfterCurrentTrack, nextTrackInPaginationWindow }]) => {
          this.visualizer$.stop({ resetLevels: true })

          if (nextTrackInPaginationWindow) {
            this.playbackContinuationTrackId = undefined

            return of({
              trackId: nextTrackInPaginationWindow.id,
              options: { navigate: false, play: true },
            })
          }

          if (nextTrackAfterCurrentTrack) {
            this.playbackContinuationTrackId = nextTrackAfterCurrentTrack.id
          } else {
            this.playbackContinuationTrackId = undefined
            this.setDesiredPlayback({ shouldPlay: false, trackId: undefined })
          }

          this.reader.navigation.goToRightOrBottomSpineItem()

          return EMPTY
        },
      ),
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
          this.setDesiredPlayback({
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
      switchMap(() => this.playAudio$()),
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

    this.subscriptions.add(playbackInterrupted$.subscribe())
    this.subscriptions.add(playback$.subscribe())

    this.subscriptions.add(
      pauseCommand$.subscribe(() => {
        this.setDesiredPlayback({ shouldPlay: false, trackId: undefined })
      }),
    )

    this.subscriptions.add(
      tracks$.subscribe(() => {
        this.resourcesResolver.releaseAll()
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
  }: {
    currentTrack: AudioTrack
    isLoading: boolean
  }) {
    this.mergeCompare({
      currentTrack,
      isLoading,
      isPlaying: false,
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
    this.visualizer$.destroy()
    this.setDesiredPlayback({ shouldPlay: false, trackId: undefined })
    this.applyMountedSource(undefined)
    this.resourcesResolver.destroy()

    super.destroy()
  }
}
