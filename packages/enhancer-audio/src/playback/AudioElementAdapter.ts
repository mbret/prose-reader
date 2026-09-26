import {
  catchError,
  defer,
  EMPTY,
  from,
  fromEvent,
  map,
  merge,
  type Observable,
  share,
  throwError,
} from "rxjs"

export type AudioMetrics = {
  currentTime: number
  duration: number | undefined
}

const isPlayInterruptedByPauseOrLoad = (error: unknown) =>
  error instanceof DOMException && error.name === `AbortError`

export class AudioElementAdapter {
  readonly element: HTMLAudioElement
  readonly ended$: Observable<Event>
  readonly isPlaying$: Observable<boolean>
  readonly metrics$: Observable<AudioMetrics>

  constructor() {
    this.element = document.createElement(`audio`)
    this.element.preload = `metadata`

    this.ended$ = fromEvent(this.element, `ended`).pipe(share())

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
        duration: Number.isFinite(this.element.duration)
          ? this.element.duration
          : undefined,
      })),
      share(),
    )
  }

  get paused() {
    return this.element.paused
  }

  get hasSource() {
    return this.element.hasAttribute(`src`)
  }

  play$() {
    return defer(() => from(this.element.play())).pipe(
      // The pause or load that interrupted the play owns what happens next.
      catchError((error: unknown) =>
        isPlayInterruptedByPauseOrLoad(error) ? EMPTY : throwError(() => error),
      ),
    )
  }

  pause() {
    this.element.pause()
  }

  loadSource(src: string) {
    this.element.src = src
    this.element.load()
  }

  unloadSource() {
    this.element.removeAttribute(`src`)
    this.element.load()
  }

  setCurrentTime(value: number) {
    this.element.currentTime = value
  }
}
