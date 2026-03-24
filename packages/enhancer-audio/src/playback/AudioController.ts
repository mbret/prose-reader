import type { Reader } from "@prose-reader/core"
import { mapKeysTo, ReactiveEntity } from "@prose-reader/core"
import { arrayEqual, isShallowEqual } from "@prose-reader/shared"
import { isDefined } from "reactjrx"
import {
  catchError,
  combineLatest,
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
  retry,
  Subject,
  Subscription,
  share,
  shareReplay,
  switchMap,
  take,
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

const getTrackAtSpineItemIndex = ({
  index,
  tracks,
}: {
  index: number | undefined
  tracks: AudioTrack[]
}) => {
  if (index === undefined) return undefined

  return tracks.find((track) => track.index === index)
}

const isUniqueDefinedTrack = (
  track: AudioTrack | undefined,
  index: number,
  values: Array<AudioTrack | undefined>,
): track is AudioTrack => {
  return track !== undefined && values.indexOf(track) === index
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
    nextTrackInPaginationWindow,
    nextTrackAfterPageTurn,
  }
}

export class AudioController extends ReactiveEntity<AudioEnhancerState> {
  private readonly reader: Reader
  private readonly audioElement = document.createElement(`audio`)
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
    this.audioElement.preload = `metadata`
    this.visualizer$ = new AudioVisualizer(this.audioElement)

    const playCommand$ = this.playCommandSubject.pipe(share())
    const pauseCommand$ = this.pauseCommandSubject.pipe(share())
    const userSelect$ = this.selectCommandSubject.pipe(share())

    const tracks$ = this.reader.context.manifest$.pipe(
      map((manifest) =>
        manifest.spineItems.filter(isAudioSpineItem).map((item) => ({
          id: item.id,
          href: item.href,
          index: item.index,
          mediaType: item.mediaType,
        })),
      ),
      shareReplay({
        bufferSize: 1,
        refCount: true,
      }),
    )

    const pagination$ = this.reader.pagination.state$.pipe(
      mapKeysTo([`beginSpineItemIndex`, `endSpineItemIndex`]),
      distinctUntilChanged(isShallowEqual),
      shareReplay({
        bufferSize: 1,
        refCount: true,
      }),
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
      shareReplay({
        bufferSize: 1,
        refCount: true,
      }),
    )

    const canPlay$ = fromEvent(this.audioElement, `canplay`).pipe(share())
    const ended$ = fromEvent(this.audioElement, `ended`).pipe(
      map(() => undefined),
      share(),
    )

    const isPlaying$ = merge(
      fromEvent(this.audioElement, `play`).pipe(map(() => true)),
      fromEvent(this.audioElement, `pause`).pipe(map(() => false)),
    ).pipe(share())

    const metrics$ = merge(
      fromEvent(this.audioElement, `timeupdate`),
      fromEvent(this.audioElement, `seeking`),
      fromEvent(this.audioElement, `seeked`),
      fromEvent(this.audioElement, `loadedmetadata`),
      fromEvent(this.audioElement, `durationchange`),
      fromEvent(this.audioElement, `canplay`),
    ).pipe(
      map(() => ({
        currentTime: this.audioElement.currentTime,
        duration: Number.isFinite(this.audioElement.duration)
          ? this.audioElement.duration
          : undefined,
      })),
      share(),
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

        return {
          tracks,
          currentTrack,
          removedTrackIds,
          shouldResetPlayback,
        }
      }),
      shareReplay({
        bufferSize: 1,
        refCount: true,
      }),
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
        (
          value,
        ): value is typeof value & {
          trackId: string
        } => value.trackId !== undefined,
      ),
      tap(({ shouldContinuePlayback }) => {
        if (shouldContinuePlayback) {
          this.clearPlaybackContinuation()
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
        options: {
          navigate: false,
          play: true,
        },
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
      map(() => undefined),
    )

    const endedSelectionIntent$ = ended$.pipe(
      withLatestFrom(pagination$),
      switchMap(([, pagination]) =>
        defer(() => {
          this.visualizer$.stop({
            resetLevels: true,
          })

          const { nextTrackAfterPageTurn, nextTrackInPaginationWindow } =
            getPaginationPlaybackTargets({
              tracks: this.state.tracks,
              pagination,
              currentTrack: this.state.currentTrack,
            })

          if (nextTrackInPaginationWindow) {
            this.clearPlaybackContinuation()

            return of({
              trackId: nextTrackInPaginationWindow.id,
              options: {
                navigate: false,
                play: true,
              },
            })
          }

          if (nextTrackAfterPageTurn) {
            this.playbackContinuationTrackId = nextTrackAfterPageTurn.id
          } else {
            this.clearPlaybackContinuation()
            this.pauseAudio()
          }

          this.reader.navigation.goToRightOrBottomSpineItem()

          return EMPTY
        }),
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
        this.clearPlaybackContinuation()
      }),
    )

    const selectionIntent$ = merge(
      userSelect$,
      visibleTrackSelectionIntent$,
      endedSelectionIntent$,
      playSelectionIntent$,
    ).pipe(share())
    const selection$ = selectionIntent$.pipe(
      withLatestFrom(this.state$),
      filter(([selectionIntent, state]) =>
        state.tracks.some(({ id }) => id === selectionIntent.trackId),
      ),
      tap(([selectionIntent]) => {
        if (selectionIntent.options.navigate === false) return

        this.reader.navigation.navigate({
          spineItem: selectionIntent.trackId,
          animation: `turn`,
        })
      }),
      tap(([selectionIntent, state]) => {
        if (
          state.currentTrack?.id !== selectionIntent.trackId ||
          !state.isLoading
        ) {
          return
        }

        if (selectionIntent.options.play !== undefined) {
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
        this.selectTrack$({
          trackId,
          options,
          playbackReset$,
        }),
      ),
      share(),
    )

    const playback$ = merge(resumePlayback$, selection$).pipe(
      switchMap(() => this.playAudio$(canPlay$)),
    )

    this.subscriptions.add(playbackInterrupted$.subscribe())
    this.subscriptions.add(playback$.subscribe())

    this.subscriptions.add(
      pauseCommand$
        .pipe(
          tap(() => {
            this.pauseAudio()
          }),
        )
        .subscribe(),
    )

    this.subscriptions.add(
      playbackReset$
        .pipe(
          tap((tracks) => {
            this.pauseAudio()
            this.visualizer$.stop({
              resetLevels: true,
            })
            this.clearMountedSource()
            this.patchState({
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
        .subscribe(),
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
          tap(({ tracks, currentTrack }) => {
            this.patchState({
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
        .subscribe(),
    )

    this.subscriptions.add(
      isPlaying$
        .pipe(
          tap((isPlaying) => {
            this.patchState({
              isPlaying,
            })

            if (!isPlaying) {
              this.visualizer$.stop()
              return
            }

            if (!this.state.currentTrack) return

            this.visualizer$.start(this.state.currentTrack)
          }),
        )
        .subscribe(),
    )

    this.subscriptions.add(
      metrics$
        .pipe(
          tap(({ currentTime, duration }) => {
            this.patchState({
              currentTime,
              duration,
            })
          }),
        )
        .subscribe(),
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

  private clearPlaybackContinuation() {
    this.playbackContinuationTrackId = undefined
  }

  private patchState(value: Partial<AudioEnhancerState>) {
    this.mergeCompare(value)
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
    this.patchState({
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
      this.audioElement.pause()
    }
  }

  private pauseAudio() {
    this.setDesiredPlayback({
      shouldPlay: false,
      trackId: undefined,
    })
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
        this.audioElement.pause()
      }

      this.audioElement.removeAttribute(`src`)
      this.audioElement.load()
    }

    if (nextMountedSource) {
      this.audioElement.src = nextMountedSource.source
      this.audioElement.load()
    }

    if (
      previousMountedSource &&
      previousMountedSource.trackId !== nextMountedSource?.trackId
    ) {
      this.releaseTrackSource(previousMountedSource.trackId)
    }
  }

  private clearMountedSource() {
    this.applyMountedSource(undefined)
  }

  private playAudio$(canPlay$: Observable<Event>) {
    return defer(() => {
      if (
        !this.shouldPlay ||
        this.desiredPlaybackTrackId === undefined ||
        this.mountedSource?.trackId !== this.desiredPlaybackTrackId ||
        !this.audioElement.src
      ) {
        return EMPTY
      }

      return from(this.audioElement.play())
    }).pipe(
      retry({
        count: 1,
        delay: () => canPlay$.pipe(take(1)),
      }),
      catchError(() => EMPTY),
    )
  }

  private resolveTrackSource(track: AudioTrack) {
    return defer(() =>
      from(Promise.resolve(this.reader.spineItemsManager.get(track.index))),
    ).pipe(
      filter(isDefined),
      switchMap((spineItem) =>
        this.resourcesResolver.getTrackResourceUrl$(
          track,
          spineItem.resourcesHandler,
        ),
      ),
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
    return defer(() => {
      const track = this.state.tracks.find(({ id }) => id === trackId)

      if (!track) return EMPTY

      const currentTrack = this.state.currentTrack
      const shouldPlay =
        options.play ??
        (!this.audioElement.paused && currentTrack !== undefined)

      this.setDesiredPlayback({
        shouldPlay,
        trackId: track.id,
      })

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
            this.pauseAudio()
            this.clearMountedSource()
            this.resetTrackSelection({
              currentTrack: track,
              isLoading: false,
              isPlaying: false,
            })
            return
          }

          this.applyMountedSource({
            trackId: track.id,
            source,
          })
          this.resetTrackSelection({
            currentTrack: track,
            isLoading: false,
            isPlaying: false,
          })
        }),
        filter(({ source }) => source !== undefined),
        map(() => undefined),
      )
    })
  }

  select(trackId: string, options: SelectAudioTrackOptions = {}) {
    this.selectCommandSubject.next({
      trackId,
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
    this.patchState({
      currentTime: value,
    })
    this.audioElement.currentTime = value
  }

  destroy() {
    this.subscriptions.unsubscribe()
    this.playCommandSubject.complete()
    this.pauseCommandSubject.complete()
    this.selectCommandSubject.complete()
    this.visualizer$.destroy()
    this.pauseAudio()
    this.clearMountedSource()
    this.resourcesResolver.destroy()

    super.destroy()
  }
}
