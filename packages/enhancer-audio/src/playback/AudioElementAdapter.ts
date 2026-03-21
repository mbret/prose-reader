import { ReactiveEntity } from "@prose-reader/core"
import {
  catchError,
  defer,
  distinctUntilChanged,
  EMPTY,
  from,
  fromEvent,
  map,
  merge,
  type Observable,
  pairwise,
  retry,
  Subscription,
  share,
  switchMap,
  take,
  tap,
} from "rxjs"

export type PlaybackIntent = {
  shouldPlay: boolean
  trackId: string | undefined
}

export type AudioElementMetrics = {
  currentTime: number
  duration: number
}

type MountedSource = {
  trackId: string
  source: string
}

type AudioElementState = {
  playbackIntent: PlaybackIntent
  mountedSource: MountedSource | undefined
}

const initialPlaybackIntent: PlaybackIntent = {
  shouldPlay: false,
  trackId: undefined,
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

export class AudioElementAdapter extends ReactiveEntity<AudioElementState> {
  readonly element = document.createElement(`audio`)
  readonly ended$: Observable<void>
  readonly isPlaying$: Observable<boolean>
  readonly metrics$: Observable<AudioElementMetrics>

  private readonly subscriptions = new Subscription()

  constructor(private readonly releaseTrackSource: (trackId: string) => void) {
    super({
      playbackIntent: initialPlaybackIntent,
      mountedSource: undefined,
    })

    this.element.preload = `metadata`

    this.ended$ = fromEvent(this.element, `ended`).pipe(
      map(() => undefined),
      share(),
    )
    this.isPlaying$ = merge(
      fromEvent(this.element, `play`).pipe(map(() => true)),
      fromEvent(this.element, `pause`).pipe(map(() => false)),
    ).pipe(share())
    this.metrics$ = merge(
      fromEvent(this.element, `timeupdate`),
      fromEvent(this.element, `seeking`),
      fromEvent(this.element, `seeked`),
      fromEvent(this.element, `loadedmetadata`),
      fromEvent(this.element, `durationchange`),
      fromEvent(this.element, `canplay`),
    ).pipe(
      map(() => ({
        currentTime: this.element.currentTime,
        duration: getPlaybackDuration(this.element),
      })),
      share(),
    )

    const canPlay$ = fromEvent(this.element, `canplay`).pipe(share())

    const mountedSource$ = this.stateSubject.pipe(
      map(({ mountedSource }) => mountedSource),
      distinctUntilChanged(
        (previousMountedSource, nextMountedSource) =>
          previousMountedSource?.trackId === nextMountedSource?.trackId &&
          previousMountedSource?.source === nextMountedSource?.source,
      ),
    )

    const sourceApplied$ = mountedSource$.pipe(
      pairwise(),
      tap(([previousMountedSource, nextMountedSource]) => {
        if (previousMountedSource) {
          this.element.pause()
          this.element.removeAttribute(`src`)
          this.element.load()

          if (previousMountedSource.trackId !== nextMountedSource?.trackId) {
            this.releaseTrackSource(previousMountedSource.trackId)
          }
        }

        if (!nextMountedSource) return

        this.element.src = nextMountedSource.source
        this.element.load()
      }),
      map(() => undefined),
      share(),
    )

    const playTrigger$ = merge(this.watch(`playbackIntent`), sourceApplied$)

    const playAudio$ = playTrigger$.pipe(
      switchMap(() => {
        return defer(() => {
          const { mountedSource, playbackIntent } = this.stateSubject.value

          if (
            !playbackIntent.shouldPlay ||
            playbackIntent.trackId === undefined ||
            mountedSource?.trackId !== playbackIntent.trackId ||
            !this.element.src
          ) {
            return EMPTY
          }

          return from(this.element.play())
        }).pipe(
          retry({
            count: 1,
            delay: () => canPlay$.pipe(take(1)),
          }),
          catchError(() => EMPTY),
        )
      }),
    )

    this.subscriptions.add(playAudio$.subscribe())
  }

  get hasSource() {
    return this.stateSubject.value.mountedSource !== undefined
  }

  get paused() {
    return this.element.paused
  }

  setPlaybackIntent(playbackIntent: PlaybackIntent) {
    this.mergeCompare({
      playbackIntent,
    })
  }

  clearPlaybackIntent() {
    this.mergeCompare({
      playbackIntent: initialPlaybackIntent,
    })
  }

  setSource({ trackId, source }: { trackId: string; source: string }) {
    this.mergeCompare({
      mountedSource: {
        trackId,
        source,
      },
    })
  }

  pause() {
    this.element.pause()
  }

  clearSource() {
    this.mergeCompare({
      mountedSource: undefined,
    })
  }

  setCurrentTime(value: number) {
    this.element.currentTime = value
  }

  destroy() {
    const trackId = this.stateSubject.value.mountedSource?.trackId

    this.subscriptions.unsubscribe()
    this.stateSubject.complete()
    this.element.pause()
    this.element.removeAttribute(`src`)
    this.element.load()

    if (trackId) {
      this.releaseTrackSource(trackId)
    }
  }
}
