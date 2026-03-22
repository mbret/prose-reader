import { ReactiveEntity, type Reader } from "@prose-reader/core"
import { isDefined } from "reactjrx"
import {
  catchError,
  defaultIfEmpty,
  defer,
  distinctUntilChanged,
  EMPTY,
  filter,
  map,
  merge,
  type Observable,
  of,
  pairwise,
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
import {
  getPaginationPlaybackTargets,
  type PaginationTrackWindow,
} from "./playbackTargetPolicy"
import { TrackSourceResolver } from "./TrackSourceResolver"
import { createVisibleTrackIds$ } from "./visibleTrackId"

type SelectCommand = {
  trackId: string
  options: SelectAudioTrackOptions
}

type ControllerAction =
  | {
      type: `play`
    }
  | {
      type: `pause`
    }
  | {
      type: `select`
      command: SelectCommand
    }

type TrackSync = {
  tracks: AudioTrack[]
  currentTrack: AudioTrack | undefined
  removedTrackIds: string[]
  shouldResetPlayback: boolean
}

const getTrackSync = ({
  state,
  tracks,
}: {
  state: AudioEnhancerState
  tracks: AudioTrack[]
}): TrackSync => {
  const nextTrackIds = new Set(tracks.map(({ id }) => id))
  const removedTrackIds = state.tracks
    .filter(({ id }) => !nextTrackIds.has(id))
    .map(({ id }) => id)
  const currentTrack =
    state.currentTrack && tracks.find(({ id }) => id === state.currentTrack?.id)
  const shouldResetPlayback =
    state.currentTrack !== undefined && currentTrack === undefined

  return {
    tracks,
    currentTrack,
    removedTrackIds,
    shouldResetPlayback,
  }
}

export class AudioController extends ReactiveEntity<AudioEnhancerState> {
  private readonly audioElementAdapter: AudioElementAdapter
  readonly visualizer$: AudioVisualizer
  readonly visibleTrackIds$: Observable<string[]>
  private readonly actionSubject = new Subject<ControllerAction>()
  private playbackContinuationTrackId: string | undefined
  private readonly subscriptions = new Subscription()
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

    const mountedObjectUrls = new Set<string>()

    this.trackSourceResolver = new TrackSourceResolver(
      reader,
      mountedObjectUrls,
    )
    this.audioElementAdapter = new AudioElementAdapter()
    this.visualizer$ = new AudioVisualizer(this.audioElementAdapter.element)
    this.visibleTrackIds$ = createVisibleTrackIds$(
      this.watch(`tracks`),
      reader.pagination.state$,
    )

    const clearPlaybackContinuation = () => {
      this.playbackContinuationTrackId = undefined
    }

    const setTrackSelectionState = ({
      currentTrack,
      isLoading,
      isPlaying,
    }: {
      currentTrack: AudioTrack | undefined
      isLoading: boolean
      isPlaying: boolean
    }) => {
      this.update({
        currentTrack,
        isLoading,
        isPlaying,
        currentTime: 0,
        duration: 0,
      })
      this.visualizer$.reset(currentTrack?.id)
    }

    const resetPlaybackSelection = ({
      tracks = this.state.tracks,
      currentTrack = undefined,
    }: {
      tracks?: AudioTrack[]
      currentTrack?: AudioTrack | undefined
    } = {}) => {
      this.visualizer$.stop({
        resetLevels: true,
      })
      this.audioElementAdapter.pause()
      this.audioElementAdapter.clearSource()
      this.update({
        tracks,
        currentTrack,
        isLoading: false,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
      })
      this.visualizer$.reset(currentTrack?.id)
    }

    const action$ = this.actionSubject.pipe(share())
    const tracks$ = reader.context.manifest$.pipe(
      map((manifest) =>
        manifest.spineItems.filter(isAudioSpineItem).map((item) => ({
          id: item.id,
          href: item.href,
          index: item.index,
          mediaType: item.mediaType,
        })),
      ),
      share(),
    )

    const playAction$ = action$.pipe(
      filter(
        (action): action is Extract<ControllerAction, { type: `play` }> =>
          action.type === `play`,
      ),
    )
    const pauseAction$ = action$.pipe(
      filter(
        (action): action is Extract<ControllerAction, { type: `pause` }> =>
          action.type === `pause`,
      ),
    )
    const selectAction$ = action$.pipe(
      filter(
        (action): action is Extract<ControllerAction, { type: `select` }> =>
          action.type === `select`,
      ),
      map(({ command }) => command),
      share(),
    )

    const trackSync$ = tracks$.pipe(
      withLatestFrom(this.state$),
      map(([tracks, state]) =>
        getTrackSync({
          state,
          tracks,
        }),
      ),
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
        const playbackContinuationTrackId = this.playbackContinuationTrackId

        return {
          trackId,
          tracks: state.tracks,
          playbackContinuationTrackId,
          currentTrackId: state.currentTrack?.id,
          isLoading: state.isLoading,
          shouldContinuePlayback:
            trackId !== undefined &&
            playbackContinuationTrackId === trackId &&
            trackId !== state.currentTrack?.id,
        }
      }),
      share(),
    )

    const visibleTrackReset$ = visibleTrackContext$.pipe(
      filter(
        ({ trackId, playbackContinuationTrackId, currentTrackId, isLoading }) =>
          trackId === undefined &&
          !playbackContinuationTrackId &&
          (currentTrackId !== undefined || isLoading),
      ),
      map(({ tracks }) => tracks),
    )

    const visibleTrackSelectionIntent$ = visibleTrackContext$.pipe(
      filter(({ trackId }) => trackId !== undefined),
      tap(({ shouldContinuePlayback }) => {
        if (shouldContinuePlayback) {
          clearPlaybackContinuation()
        }
      }),
      map(({ trackId, shouldContinuePlayback }) => ({
        trackId: trackId as string,
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

    const playbackInterrupted$ = merge(
      pauseAction$.pipe(map(() => undefined)),
      playbackReset$.pipe(map(() => undefined)),
      selectAction$.pipe(
        filter(({ options }) => options.navigate !== false),
        map(() => undefined),
      ),
    )

    const selectTrackById$ = (
      trackId: string,
      options: SelectAudioTrackOptions,
    ) =>
      defer(() => {
        const track = this.state.tracks.find(({ id }) => id === trackId)

        if (!track) return EMPTY

        if (options.navigate !== false) {
          reader.navigation.navigate({
            spineItem: track.index,
            animation: `turn`,
          })
        }

        const currentTrack = this.state.currentTrack
        const shouldPlay =
          options.play ??
          (!this.audioElementAdapter.paused && currentTrack !== undefined)

        if (shouldPlay) {
          this.audioElementAdapter.play(track.id)
        } else {
          this.audioElementAdapter.pause()
        }

        if (
          currentTrack?.id === track.id &&
          this.audioElementAdapter.hasSource
        ) {
          this.visualizer$.setTrack(track.id)

          return EMPTY
        }

        if (!shouldPlay) {
          if (currentTrack?.id !== track.id) {
            this.audioElementAdapter.clearSource()
          }

          setTrackSelectionState({
            currentTrack: track,
            isLoading: false,
            isPlaying: false,
          })

          return EMPTY
        }

        setTrackSelectionState({
          currentTrack: track,
          isLoading: true,
          isPlaying: false,
        })

        return this.trackSourceResolver.resolveTrackSource(track).pipe(
          map((source) => ({ source })),
          defaultIfEmpty({ source: undefined }),
          catchError(() => of({ source: undefined })),
          takeUntil(playbackReset$),
          tap(({ source }) => {
            if (!source) {
              this.audioElementAdapter.pause()
              this.audioElementAdapter.clearSource()
              setTrackSelectionState({
                currentTrack: track,
                isLoading: false,
                isPlaying: false,
              })
              return
            }

            this.audioElementAdapter.setSource({
              trackId: track.id,
              source,
            })
            setTrackSelectionState({
              currentTrack: track,
              isLoading: false,
              isPlaying: false,
            })
          }),
        )
      })

    const endedSelectionIntent$ = this.audioElementAdapter.ended$.pipe(
      withLatestFrom(reader.pagination.state$),
      switchMap(([, pagination]) =>
        defer(() => {
          this.visualizer$.stop({
            resetLevels: true,
          })

          const { nextTrackAfterPageTurn, nextTrackInPaginationWindow } =
            getPaginationPlaybackTargets({
              tracks: this.state.tracks,
              pagination: pagination as PaginationTrackWindow,
              currentTrack: this.state.currentTrack,
            })

          if (nextTrackInPaginationWindow) {
            clearPlaybackContinuation()

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
            clearPlaybackContinuation()
            this.audioElementAdapter.pause()
          }

          reader.navigation.goToRightOrBottomSpineItem()

          return EMPTY
        }),
      ),
    )

    const audioAdapterUnMountedTrackId$ =
      this.audioElementAdapter.mountedTrackId$.pipe(
        pairwise(),
        map(([previousMountedTrackId, nextMountedTrackId]) => {
          if (
            !previousMountedTrackId ||
            previousMountedTrackId === nextMountedTrackId
          ) {
            return
          }

          return previousMountedTrackId
        }),
        filter(isDefined),
      )

    const releaseTrackSource$ = audioAdapterUnMountedTrackId$.pipe(
      tap((previousMountedTrackId) => {
        this.trackSourceResolver.releaseTrackSource(previousMountedTrackId)
      }),
    )

    this.subscriptions.add(releaseTrackSource$.subscribe())

    this.subscriptions.add(
      playbackInterrupted$
        .pipe(tap(() => clearPlaybackContinuation()))
        .subscribe(),
    )

    this.subscriptions.add(
      playbackReset$
        .pipe(
          tap((tracks) => {
            resetPlaybackSelection({
              tracks,
            })
          }),
        )
        .subscribe(),
    )

    this.subscriptions.add(
      trackSync$
        .pipe(
          withLatestFrom(this.audioElementAdapter.mountedTrackId$),
          tap(([{ removedTrackIds }, mountedTrackId]) => {
            for (const trackId of removedTrackIds) {
              if (trackId === mountedTrackId) continue

              this.trackSourceResolver.releaseTrackSource(trackId)
            }
          }),
          tap(([{ shouldResetPlayback, tracks, currentTrack }]) => {
            if (shouldResetPlayback) return

            this.update({
              tracks,
              currentTrack,
              isLoading: currentTrack ? this.state.isLoading : false,
              isPlaying: currentTrack ? this.state.isPlaying : false,
              currentTime: currentTrack ? this.state.currentTime : 0,
              duration: currentTrack ? this.state.duration : 0,
            })
            this.visualizer$.reset(currentTrack?.id)
          }),
        )
        .subscribe(),
    )

    this.subscriptions.add(
      playAction$
        .pipe(
          tap(() => {
            clearPlaybackContinuation()

            if (!this.audioElementAdapter.hasSource) {
              const initialTrack =
                this.state.currentTrack ?? this.state.tracks[0]

              if (!initialTrack) return

              this.actionSubject.next({
                type: `select`,
                command: {
                  trackId: initialTrack.id,
                  options: {
                    navigate: false,
                    play: true,
                  },
                },
              })

              return
            }

            this.audioElementAdapter.play(this.state.currentTrack?.id)
          }),
        )
        .subscribe(),
    )

    this.subscriptions.add(
      pauseAction$
        .pipe(
          tap(() => {
            this.audioElementAdapter.pause()
          }),
        )
        .subscribe(),
    )

    this.subscriptions.add(
      merge(selectAction$, visibleTrackSelectionIntent$, endedSelectionIntent$)
        .pipe(
          switchMap(({ trackId, options }) =>
            selectTrackById$(trackId, options),
          ),
        )
        .subscribe(),
    )

    this.subscriptions.add(
      this.audioElementAdapter.isPlaying$
        .pipe(
          tap((isPlaying) => {
            this.update({
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
      this.audioElementAdapter.metrics$
        .pipe(
          tap(({ currentTime, duration }) => {
            this.update({
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

  update(value: Partial<AudioEnhancerState>) {
    this.mergeCompare(value)
  }

  select(trackId: string, options: SelectAudioTrackOptions = {}) {
    this.actionSubject.next({
      type: `select`,
      command: {
        trackId,
        options,
      },
    })
  }

  play() {
    this.actionSubject.next({
      type: `play`,
    })
  }

  pause() {
    this.actionSubject.next({
      type: `pause`,
    })
  }

  toggle() {
    if (this.audioElementAdapter.paused) {
      this.play()
      return
    }

    this.pause()
  }

  setCurrentTime(value: number) {
    this.update({
      currentTime: value,
    })
    this.audioElementAdapter.setCurrentTime(value)
  }

  destroy() {
    this.subscriptions.unsubscribe()
    this.actionSubject.complete()
    this.visualizer$.destroy()
    this.audioElementAdapter.destroy()
    this.trackSourceResolver.destroy()

    super.destroy()
  }
}
