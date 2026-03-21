import { ReactiveEntity, type Reader } from "@prose-reader/core"
import {
  BehaviorSubject,
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
  share,
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

const getPlaybackDuration = (audioElement: HTMLAudioElement) => {
  if (Number.isFinite(audioElement.duration) && audioElement.duration > 0) {
    return audioElement.duration
  }

  const seekableRangeCount = audioElement.seekable.length

  if (seekableRangeCount > 0) {
    const seekableDuration = audioElement.seekable.end(seekableRangeCount - 1)

    if (Number.isFinite(seekableDuration) && seekableDuration > 0) {
      return seekableDuration
    }
  }

  return 0
}

type SelectCommand = {
  track: AudioTrack | number | string
  options: SelectAudioTrackOptions
}

type PlaybackIntent = {
  shouldPlay: boolean
  trackId: string | undefined
}

type ControllerAction =
  | {
      type: `play`
    }
  | {
      type: `pause`
    }
  | {
      type: `reset`
    }
  | {
      type: `select`
      command: SelectCommand
    }
  | {
      type: `tracks`
      tracks: AudioTrack[]
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

  return {
    tracks,
    currentTrack,
    removedTrackIds,
    shouldResetPlayback: !currentTrack,
  }
}

export class AudioController extends ReactiveEntity<AudioEnhancerState> {
  private readonly audioElement = document.createElement(`audio`)
  readonly visualizer$ = new AudioVisualizer(this.audioElement)
  readonly visibleTrackIds$: Observable<string[]>
  private audioElementSourceTrackId: string | undefined
  private readonly actionSubject = new Subject<ControllerAction>()
  private readonly playbackIntentSubject = new BehaviorSubject<PlaybackIntent>({
    shouldPlay: false,
    trackId: undefined,
  })
  private readonly playbackContinuationTrackIdSubject = new BehaviorSubject<
    string | undefined
  >(undefined)
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
    this.visibleTrackIds$ = createVisibleTrackIds$(
      this.watch(`tracks`),
      reader.pagination.state$,
    )
    this.audioElement.preload = `metadata`

    const clearPlaybackIntent = () => {
      this.playbackIntentSubject.next({
        shouldPlay: false,
        trackId: undefined,
      })
    }

    const clearPlaybackContinuation = () => {
      this.playbackContinuationTrackIdSubject.next(undefined)
    }

    const clearAudioSource = (activeTrackId?: string) => {
      const trackId = this.audioElementSourceTrackId

      this.audioElement.pause()
      this.audioElement.removeAttribute(`src`)
      this.audioElement.load()
      this.audioElementSourceTrackId = undefined

      if (!trackId || trackId === activeTrackId) return

      this.trackSourceResolver.releaseTrackSource(trackId)
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

    const playAudio$ = () => from(this.audioElement.play())

    const createPlayWhenReady$ = () =>
      defer(() => {
        const playbackIntent = this.playbackIntentSubject.value

        if (
          !playbackIntent.shouldPlay ||
          playbackIntent.trackId === undefined ||
          this.state.currentTrack === undefined ||
          this.state.isLoading ||
          this.state.currentTrack.id !== playbackIntent.trackId ||
          this.audioElementSourceTrackId !== playbackIntent.trackId ||
          !this.audioElement.src
        ) {
          return EMPTY
        }

        return playAudio$().pipe(
          catchError(() =>
            fromEvent(this.audioElement, `canplay`).pipe(
              take(1),
              switchMap(() => playAudio$()),
              catchError(() => EMPTY),
            ),
          ),
        )
      })

    const action$ = this.actionSubject.pipe(share())

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
    const resetAction$ = action$.pipe(
      filter(
        (action): action is Extract<ControllerAction, { type: `reset` }> =>
          action.type === `reset`,
      ),
      map(() => undefined),
      share(),
    )
    const selectAction$ = action$.pipe(
      filter(
        (action): action is Extract<ControllerAction, { type: `select` }> =>
          action.type === `select`,
      ),
      map(({ command }) => command),
      share(),
    )
    const tracksAction$ = action$.pipe(
      filter(
        (action): action is Extract<ControllerAction, { type: `tracks` }> =>
          action.type === `tracks`,
      ),
      map(({ tracks }) => tracks),
      share(),
    )

    const trackSync$ = tracksAction$.pipe(
      withLatestFrom(this.state$),
      map(([tracks, state]) =>
        getTrackSync({
          state,
          tracks,
        }),
      ),
      share(),
    )

    const playbackReset$ = merge(
      resetAction$,
      trackSync$.pipe(
        filter(({ shouldResetPlayback }) => shouldResetPlayback),
        map(() => undefined),
      ),
    ).pipe(share())

    const playbackInterrupted$ = merge(
      pauseAction$.pipe(map(() => undefined)),
      playbackReset$,
      selectAction$.pipe(
        filter(({ options }) => options.navigate !== false),
        map(() => undefined),
      ),
    )

    const selectTrackByIndex$ = (
      trackIndex: number,
      options: SelectAudioTrackOptions,
    ) =>
      defer(() => {
        const track = this.state.tracks[trackIndex]

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
          (!this.audioElement.paused && currentTrack !== undefined)

        this.playbackIntentSubject.next({
          shouldPlay,
          trackId: shouldPlay ? track.id : undefined,
        })

        if (currentTrack?.id === track.id && this.audioElement.src) {
          this.visualizer$.setTrack(track.id)

          return EMPTY
        }

        if (!shouldPlay) {
          if (currentTrack?.id !== track.id) {
            clearAudioSource(track.id)
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
              clearPlaybackIntent()
              clearAudioSource(track.id)
              setTrackSelectionState({
                currentTrack: track,
                isLoading: false,
                isPlaying: false,
              })
              return
            }

            clearAudioSource(track.id)
            this.audioElement.src = source
            this.audioElementSourceTrackId = track.id
            this.audioElement.load()
            setTrackSelectionState({
              currentTrack: track,
              isLoading: false,
              isPlaying: false,
            })
            this.playbackIntentSubject.next({
              shouldPlay: true,
              trackId: track.id,
            })
          }),
        )
      })

    const visibleTrackSelectionIntent$ = this.visibleTrackIds$.pipe(
      map((trackIds) => trackIds[0]),
      distinctUntilChanged(),
      withLatestFrom(this.playbackContinuationTrackIdSubject),
      switchMap(([trackId, playbackContinuationTrackId]) =>
        defer(() => {
          if (trackId === undefined) {
            if (!playbackContinuationTrackId) {
              if (this.state.currentTrack || this.state.isLoading) {
                this.actionSubject.next({
                  type: `reset`,
                })
                clearAudioSource()
                setTrackSelectionState({
                  currentTrack: undefined,
                  isLoading: false,
                  isPlaying: false,
                })
              }
            }

            return EMPTY
          }

          const shouldContinuePlayback =
            playbackContinuationTrackId === trackId &&
            trackId !== this.state.currentTrack?.id

          if (shouldContinuePlayback) {
            clearPlaybackContinuation()
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

    const endedSelectionIntent$ = fromEvent(this.audioElement, `ended`).pipe(
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
              track: nextTrackInPaginationWindow.id,
              options: {
                navigate: false,
                play: true,
              },
            })
          }

          if (nextTrackAfterPageTurn) {
            this.playbackContinuationTrackIdSubject.next(
              nextTrackAfterPageTurn.id,
            )
          } else {
            clearPlaybackContinuation()
            clearPlaybackIntent()
          }

          reader.navigation.goToRightOrBottomSpineItem()

          return EMPTY
        }),
      ),
    )

    this.subscriptions.add(
      playbackInterrupted$
        .pipe(tap(() => clearPlaybackContinuation()))
        .subscribe(),
    )

    this.subscriptions.add(
      playbackReset$.pipe(tap(() => clearPlaybackIntent())).subscribe(),
    )

    this.subscriptions.add(
      trackSync$
        .pipe(
          tap(({ removedTrackIds }) => {
            for (const trackId of removedTrackIds) {
              this.trackSourceResolver.releaseTrackSource(trackId)
            }
          }),
          tap(({ shouldResetPlayback }) => {
            if (!shouldResetPlayback) return

            this.visualizer$.stop({
              resetLevels: true,
            })
            clearAudioSource()
          }),
          tap(({ tracks, currentTrack }) => {
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

            if (!this.audioElement.src) {
              const initialTrack =
                this.state.currentTrack ?? this.state.tracks[0]

              if (!initialTrack) return

              this.playbackIntentSubject.next({
                shouldPlay: true,
                trackId: initialTrack.id,
              })

              const trackIndex = this.state.tracks.findIndex(
                ({ id }) => id === initialTrack.id,
              )

              if (trackIndex < 0) return

              this.actionSubject.next({
                type: `select`,
                command: {
                  track: trackIndex,
                  options: {
                    navigate: false,
                    play: true,
                  },
                },
              })

              return
            }

            this.playbackIntentSubject.next({
              shouldPlay: true,
              trackId: this.state.currentTrack?.id,
            })
          }),
        )
        .subscribe(),
    )

    this.subscriptions.add(
      pauseAction$
        .pipe(
          tap(() => {
            clearPlaybackIntent()
            this.audioElement.pause()
          }),
        )
        .subscribe(),
    )

    this.subscriptions.add(
      this.playbackIntentSubject
        .pipe(switchMap(() => createPlayWhenReady$()))
        .subscribe(),
    )

    this.subscriptions.add(
      merge(selectAction$, visibleTrackSelectionIntent$, endedSelectionIntent$)
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
            selectTrackByIndex$(trackIndex, options),
          ),
        )
        .subscribe(),
    )

    this.subscriptions.add(
      reader.context.manifest$
        .pipe(
          map((manifest) =>
            manifest.spineItems.filter(isAudioSpineItem).map((item) => ({
              id: item.id,
              href: item.href,
              index: item.index,
              mediaType: item.mediaType,
            })),
          ),
          tap((tracks) => {
            this.actionSubject.next({
              type: `tracks`,
              tracks,
            })
          }),
        )
        .subscribe(),
    )

    this.subscriptions.add(
      fromEvent(this.audioElement, `play`)
        .pipe(
          tap(() => {
            this.update({
              isPlaying: true,
            })

            if (!this.state.currentTrack) return

            this.visualizer$.start(this.state.currentTrack)
          }),
        )
        .subscribe(),
    )

    this.subscriptions.add(
      fromEvent(this.audioElement, `pause`)
        .pipe(
          tap(() => {
            this.update({
              isPlaying: false,
            })
            this.visualizer$.stop()
          }),
        )
        .subscribe(),
    )

    this.subscriptions.add(
      merge(
        fromEvent(this.audioElement, `timeupdate`),
        fromEvent(this.audioElement, `seeking`),
        fromEvent(this.audioElement, `seeked`),
        fromEvent(this.audioElement, `loadedmetadata`),
        fromEvent(this.audioElement, `durationchange`),
        fromEvent(this.audioElement, `canplay`),
      )
        .pipe(
          tap(() => {
            this.update({
              currentTime: this.audioElement.currentTime,
              duration: getPlaybackDuration(this.audioElement),
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

  setTracks(tracks: AudioTrack[]) {
    this.actionSubject.next({
      type: `tracks`,
      tracks,
    })
  }

  select(
    track: AudioTrack | number | string,
    options: SelectAudioTrackOptions = {},
  ) {
    this.actionSubject.next({
      type: `select`,
      command: {
        track,
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
    this.actionSubject.next({
      type: `reset`,
    })
    this.subscriptions.unsubscribe()
    this.actionSubject.complete()
    this.playbackIntentSubject.complete()
    this.playbackContinuationTrackIdSubject.complete()
    this.visualizer$.destroy()

    const trackId = this.audioElementSourceTrackId

    this.audioElement.pause()
    this.audioElement.removeAttribute(`src`)
    this.audioElement.load()
    this.audioElementSourceTrackId = undefined

    if (trackId) {
      this.trackSourceResolver.releaseTrackSource(trackId)
    }

    this.trackSourceResolver.destroy()

    super.destroy()
  }
}
