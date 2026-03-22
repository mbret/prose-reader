import type { Reader, ResourceHandler } from "@prose-reader/core"
import { ReactiveEntity } from "@prose-reader/core"
import { isDefined } from "reactjrx"
import {
  catchError,
  combineLatest,
  defaultIfEmpty,
  defer,
  distinctUntilChanged,
  EMPTY,
  filter,
  finalize,
  from,
  fromEvent,
  map,
  merge,
  Observable,
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

type TrackResource = Awaited<ReturnType<ResourceHandler["getResource"]>>

type SelectCommand = {
  trackId: string
  options: SelectAudioTrackOptions
}

type ControllerCommand =
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

type PaginationTrackWindow = {
  beginSpineItemIndex: number | undefined
  endSpineItemIndex: number | undefined
}

type MountedSource = {
  trackId: string
  source: string
}

type TrackSync = {
  tracks: AudioTrack[]
  currentTrack: AudioTrack | undefined
  removedTrackIds: string[]
  shouldResetPlayback: boolean
}

const initialState: AudioEnhancerState = {
  tracks: [],
  currentTrack: undefined,
  isPlaying: false,
  isLoading: false,
  currentTime: 0,
  duration: 0,
}

const areTrackIdsEqual = (previous: string[], next: string[]) => {
  return (
    previous.length === next.length &&
    previous.every((trackId, index) => trackId === next[index])
  )
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
  readonly visibleTrackIds$: Observable<string[]>

  private readonly commandSubject = new Subject<ControllerCommand>()
  private readonly subscriptions = new Subscription()

  private mountedSource: MountedSource | undefined
  private desiredPlaybackTrackId: string | undefined
  private shouldPlay = false
  private playbackContinuationTrackId: string | undefined
  private isDestroyed = false

  private readonly sourceByTrackId = new Map<string, string>()
  private readonly pendingSourceByTrackId = new Map<
    string,
    Observable<string>
  >()
  private readonly cachedObjectUrlByTrackId = new Map<string, string>()
  private readonly sourceRequestVersionByTrackId = new Map<string, number>()

  constructor(reader: Reader) {
    super(initialState)

    this.reader = reader
    this.audioElement.preload = `metadata`
    this.visualizer$ = new AudioVisualizer(this.audioElement)

    const command$ = this.commandSubject.pipe(share())
    const playCommand$ = command$.pipe(
      filter(
        (command): command is Extract<ControllerCommand, { type: `play` }> =>
          command.type === `play`,
      ),
      share(),
    )
    const pauseCommand$ = command$.pipe(
      filter(
        (command): command is Extract<ControllerCommand, { type: `pause` }> =>
          command.type === `pause`,
      ),
      share(),
    )
    const userSelect$ = command$.pipe(
      filter(
        (command): command is Extract<ControllerCommand, { type: `select` }> =>
          command.type === `select`,
      ),
      map(({ command }) => command),
      share(),
    )

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
      map(({ beginSpineItemIndex, endSpineItemIndex }) => ({
        beginSpineItemIndex,
        endSpineItemIndex,
      })),
      distinctUntilChanged(
        (previous, next) =>
          previous.beginSpineItemIndex === next.beginSpineItemIndex &&
          previous.endSpineItemIndex === next.endSpineItemIndex,
      ),
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
      distinctUntilChanged(areTrackIdsEqual),
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
        duration: getPlaybackDuration(this.audioElement),
      })),
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
      filter(({ trackId }) => trackId !== undefined),
      tap(({ shouldContinuePlayback }) => {
        if (shouldContinuePlayback) {
          this.clearPlaybackContinuation()
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
      switchMap(({ trackId, options }) =>
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
              duration: 0,
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
              duration: currentTrack ? this.state.duration : 0,
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
      duration: 0,
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

  private getNextTrackSourceVersion(trackId: string) {
    const nextVersion =
      (this.sourceRequestVersionByTrackId.get(trackId) ?? 0) + 1

    this.sourceRequestVersionByTrackId.set(trackId, nextVersion)

    return nextVersion
  }

  private isTrackSourceRequestActive(trackId: string, version: number) {
    return (
      !this.isDestroyed &&
      this.sourceRequestVersionByTrackId.get(trackId) === version
    )
  }

  private resolveTrackSource(track: AudioTrack) {
    const cachedSource = this.sourceByTrackId.get(track.id)

    if (cachedSource) {
      return of(cachedSource)
    }

    const pendingSource = this.pendingSourceByTrackId.get(track.id)

    if (pendingSource) {
      return pendingSource
    }

    const version = this.getNextTrackSourceVersion(track.id)
    let source$: Observable<string>

    source$ = new Observable<string>((subscriber) => {
      let isCancelled = false

      const emitTrackSource = (source: string) => {
        if (
          isCancelled ||
          subscriber.closed ||
          !this.isTrackSourceRequestActive(track.id, version)
        ) {
          return
        }

        this.sourceByTrackId.set(track.id, source)
        subscriber.next(source)
        subscriber.complete()
      }

      const completeIfInactive = () => {
        if (
          !isCancelled &&
          !subscriber.closed &&
          this.isTrackSourceRequestActive(track.id, version)
        ) {
          subscriber.complete()
        }
      }

      const resolveResponseSource = async (resource: Response) => {
        const cachedObjectUrl = this.cachedObjectUrlByTrackId.get(track.id)

        if (cachedObjectUrl) {
          emitTrackSource(cachedObjectUrl)
          return
        }

        const blob = await resource.blob()

        if (
          !this.isTrackSourceRequestActive(track.id, version) ||
          isCancelled
        ) {
          completeIfInactive()
          return
        }

        const objectUrl = URL.createObjectURL(blob)

        if (
          !this.isTrackSourceRequestActive(track.id, version) ||
          isCancelled
        ) {
          URL.revokeObjectURL(objectUrl)
          completeIfInactive()
          return
        }

        this.cachedObjectUrlByTrackId.set(track.id, objectUrl)
        emitTrackSource(objectUrl)
      }

      void Promise.resolve(this.reader.spineItemsManager.get(track.index))
        .then((spineItem) => {
          if (
            !spineItem ||
            isCancelled ||
            !this.isTrackSourceRequestActive(track.id, version)
          ) {
            completeIfInactive()
            return
          }

          return Promise.resolve(spineItem.resourcesHandler.getResource()).then(
            (resource: TrackResource) => {
              if (
                isCancelled ||
                !this.isTrackSourceRequestActive(track.id, version)
              ) {
                completeIfInactive()
                return
              }

              if (resource instanceof URL) {
                emitTrackSource(resource.href)
                return
              }

              if (resource instanceof Response) {
                return resolveResponseSource(resource)
              }

              emitTrackSource(track.href)
              return
            },
          )
        })
        .catch((error) => {
          if (!isCancelled && !subscriber.closed) {
            subscriber.error(error)
          }
        })

      return () => {
        isCancelled = true
      }
    }).pipe(
      finalize(() => {
        if (this.pendingSourceByTrackId.get(track.id) === source$) {
          this.pendingSourceByTrackId.delete(track.id)
        }
      }),
      shareReplay({
        bufferSize: 1,
        refCount: true,
      }),
    )

    this.pendingSourceByTrackId.set(track.id, source$)

    return source$
  }

  private releaseTrackSource(trackId: string) {
    this.getNextTrackSourceVersion(trackId)
    this.sourceByTrackId.delete(trackId)
    this.pendingSourceByTrackId.delete(trackId)

    const cachedObjectUrl = this.cachedObjectUrlByTrackId.get(trackId)

    if (!cachedObjectUrl) return

    this.cachedObjectUrlByTrackId.delete(trackId)
    URL.revokeObjectURL(cachedObjectUrl)
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

      this.setDesiredPlayback({
        shouldPlay,
        trackId: track.id,
      })

      if (currentTrack?.id === track.id && this.hasSource) {
        this.visualizer$.setTrack(track.id)

        return shouldPlay ? of(undefined) : EMPTY
      }

      if (!shouldPlay) {
        if (currentTrack?.id !== track.id) {
          this.clearMountedSource()
        }

        this.resetTrackSelection({
          currentTrack: track,
          isLoading: false,
          isPlaying: false,
        })

        return EMPTY
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
    this.commandSubject.next({
      type: `select`,
      command: {
        trackId,
        options,
      },
    })
  }

  play() {
    this.commandSubject.next({
      type: `play`,
    })
  }

  pause() {
    this.commandSubject.next({
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
    this.patchState({
      currentTime: value,
    })
    this.audioElement.currentTime = value
  }

  destroy() {
    this.isDestroyed = true
    this.subscriptions.unsubscribe()
    this.commandSubject.complete()
    this.visualizer$.destroy()
    this.pauseAudio()
    this.clearMountedSource()

    const trackIds = new Set([
      ...this.sourceByTrackId.keys(),
      ...this.pendingSourceByTrackId.keys(),
      ...this.cachedObjectUrlByTrackId.keys(),
      ...this.sourceRequestVersionByTrackId.keys(),
    ])

    for (const trackId of trackIds) {
      this.releaseTrackSource(trackId)
    }

    super.destroy()
  }
}
