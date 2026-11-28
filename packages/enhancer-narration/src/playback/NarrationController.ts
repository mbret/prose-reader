import {
  type Reader,
  reportRecoveredError,
  type SpineItem,
} from "@prose-reader/core"
import { isShallowEqual } from "@prose-reader/shared"
import {
  BehaviorSubject,
  concatMap,
  defer,
  distinctUntilChanged,
  EMPTY,
  filter,
  first,
  from,
  map,
  materialize,
  Observable,
  type ObservableNotification,
  observeOn,
  of,
  queueScheduler,
  range,
  Subject,
  Subscription,
  scan,
  startWith,
  subscribeOn,
  switchMap,
  switchScan,
  take,
  tap,
  UnsubscriptionError,
} from "rxjs"
import type {
  NarrationActiveUnit,
  NarrationSource,
  NarrationState,
  SpineItemNarration,
} from "../types.ts"

type NarrationCommand = "play" | "pause" | "stop"

/** A unit of what a source narrates of its spine item. */
type NarrationPlaceOnUnit = {
  spineItemNarration: SpineItemNarration
  activeUnit: NarrationActiveUnit
}

/**
 * Where the narration is, or resumes from: a unit, or the start of a spine
 * item whose units are not known because the sources did not answer yet.
 */
type NarrationPlace = NarrationPlaceOnUnit | { spineItemIndex: number }

type PlaybackUnderWay =
  | { status: "loading"; place: NarrationPlace }
  | { status: "playing"; place: NarrationPlaceOnUnit }

type PlaybackState =
  | { status: "idle" }
  | PlaybackUnderWay
  | { status: "paused"; hasError: boolean; place: NarrationPlace }

const idlePlaybackState: PlaybackState = { status: "idle" }

const isPlaceOnUnit = (place: NarrationPlace): place is NarrationPlaceOnUnit =>
  "activeUnit" in place

const getSpineItemIndexOfPlace = (place: NarrationPlace) =>
  isPlaceOnUnit(place) ? place.activeUnit.spineItemIndex : place.spineItemIndex

const getActiveUnitOfPlace = (place: NarrationPlace) =>
  isPlaceOnUnit(place) ? place.activeUnit : undefined

const isPlaybackUnderWay = (
  playbackState: PlaybackState,
): playbackState is PlaybackUnderWay =>
  playbackState.status === "playing" || playbackState.status === "loading"

const playbackStateToNarrationState = (
  playbackState: PlaybackState,
): NarrationState => {
  switch (playbackState.status) {
    case "idle":
      return { status: "idle", activeUnit: undefined }
    case "loading":
      return {
        status: "loading",
        activeUnit: getActiveUnitOfPlace(playbackState.place),
      }
    case "playing":
      return { status: "playing", activeUnit: playbackState.place.activeUnit }
    case "paused":
      return {
        status: "paused",
        activeUnit: getActiveUnitOfPlace(playbackState.place),
        hasError: playbackState.hasError,
      }
  }
}

/**
 * A source can throw while it is unsubscribed from. The error would leave
 * through the command that replaces its playback, end the state for good,
 * and stop the destruction of the reader halfway. It is reported, and the
 * unsubscription goes on.
 */
const reportErrorOfTeardown =
  <Value>() =>
  (source$: Observable<Value>) =>
    new Observable<Value>((subscriber) => {
      // An observer of its own: given the subscriber itself, the source
      // would add its teardown to it, and that teardown would run outside
      // the `try` below.
      const subscription = source$.subscribe({
        next: (value) => subscriber.next(value),
        error: (error: unknown) => subscriber.error(error),
        complete: () => subscriber.complete(),
      })

      return () => {
        try {
          subscription.unsubscribe()
        } catch (error) {
          // rxjs wraps what the teardowns of a subscription throw.
          const errors =
            error instanceof UnsubscriptionError ? error.errors : [error]

          errors.forEach(reportRecoveredError)
        }
      }
    })

const isSameNarrationState = (
  previous: NarrationState,
  current: NarrationState,
) =>
  previous.status === current.status &&
  isShallowEqual(previous.activeUnit, current.activeUnit) &&
  (previous.status === "paused" && previous.hasError) ===
    (current.status === "paused" && current.hasError)

export class NarrationController {
  private readonly commandSubject = new Subject<NarrationCommand>()
  private readonly playbackStateSubject = new BehaviorSubject<PlaybackState>(
    idlePlaybackState,
  )
  private readonly stateSubject = new BehaviorSubject<NarrationState>(
    playbackStateToNarrationState(idlePlaybackState),
  )
  private readonly subscriptions = new Subscription()

  public readonly state$ = this.stateSubject.asObservable()

  constructor(
    private readonly reader: Reader,
    private readonly sources: readonly NarrationSource[],
  ) {
    /**
     * The one place that makes the state. A command replaces what the
     * previous one started: `switchScan` unsubscribes from it, which stops the
     * sound of its source, and a late answer of that source changes nothing.
     */
    const playbackState$ = this.commandSubject.pipe(
      filter(
        (command) =>
          // A `play` would start the sound of the playback under way again.
          // It has to be dropped here, before `switchScan` replaces that
          // playback, so this reads the state the pipeline itself made: the
          // one the previous command led to, delivered or not yet.
          !(
            command === "play" &&
            isPlaybackUnderWay(this.playbackStateSubject.value)
          ),
      ),
      switchScan(
        (playbackState, command) =>
          this.getPlaybackStatesAfterCommand$(playbackState, command),
        idlePlaybackState,
      ),
    )

    this.subscriptions.add(playbackState$.subscribe(this.playbackStateSubject))
    this.subscriptions.add(
      this.playbackStateSubject
        .pipe(
          // A subscriber may send a command while it receives a state. The
          // command applies at once, and the state it leads to waits in the
          // queue for the end of that delivery: every subscriber receives
          // the states in the order they were made.
          observeOn(queueScheduler),
          map(playbackStateToNarrationState),
          distinctUntilChanged(isSameNarrationState),
        )
        .subscribe(this.stateSubject),
    )
  }

  public get state() {
    return this.stateSubject.value
  }

  public play() {
    this.commandSubject.next("play")
  }

  public pause() {
    this.commandSubject.next("pause")
  }

  public stop() {
    this.commandSubject.next("stop")
  }

  public destroy() {
    this.subscriptions.unsubscribe()
    this.commandSubject.complete()
    this.playbackStateSubject.complete()
    this.stateSubject.complete()
  }

  private getPlaybackStatesAfterCommand$(
    playbackState: PlaybackState,
    command: NarrationCommand,
  ): Observable<PlaybackState> {
    if (command === "stop") return of(idlePlaybackState)

    if (command === "pause") {
      return of(
        isPlaybackUnderWay(playbackState)
          ? { status: "paused", hasError: false, place: playbackState.place }
          : playbackState,
      )
    }

    return this.narrateFromPlace$(
      playbackState.status === "idle"
        ? {
            spineItemIndex:
              this.reader.pagination.state.begin.spineItemIndex ?? 0,
          }
        : playbackState.place,
    )
  }

  /**
   * The states of a playback that starts at `place` and goes on through the
   * following spine items. It ends `idle` after the last one, or paused at
   * the latest place when a source fails.
   */
  private narrateFromPlace$(place: NarrationPlace): Observable<PlaybackState> {
    const spineItemIndex = getSpineItemIndexOfPlace(place)

    return range(
      spineItemIndex,
      this.reader.spineItemsManager.items.length - spineItemIndex,
    ).pipe(
      concatMap((indexOfSpineItemToNarrate) =>
        indexOfSpineItemToNarrate === spineItemIndex
          ? // The command applies at once: nothing delays its first spine item.
            this.narrateSpineItemFromPlace$(place)
          : this.narrateSpineItemFromPlace$({
              spineItemIndex: indexOfSpineItemToNarrate,
            }).pipe(
              // A spine item with nothing to narrate can end as soon as it
              // is subscribed to, and a book can have thousands in a row.
              // Through the queue, the next one starts once the previous one
              // returned, not inside it: the stack does not grow with the
              // spine items.
              subscribeOn(queueScheduler),
            ),
      ),
      // The app sees the error of a source where it sees the reader's own.
      tap({ error: reportRecoveredError }),
      // The end and the error of the playback become values, so that the
      // state they lead to is made from the latest one, as every other state.
      // A spine item starts with a `loading` state, so an error always finds
      // a playback under way to pause.
      materialize(),
      scan<ObservableNotification<PlaybackUnderWay>, PlaybackState>(
        (latestPlaybackState, notification) => {
          if (notification.kind === "N") return notification.value

          if (notification.kind === "C") return idlePlaybackState

          return isPlaybackUnderWay(latestPlaybackState)
            ? {
                status: "paused",
                hasError: true,
                place: latestPlaybackState.place,
              }
            : latestPlaybackState
        },
        { status: "loading", place },
      ),
    )
  }

  /**
   * The states of the playback of one spine item. It completes once its
   * source played its last unit, or at once when no source has units for it.
   */
  private narrateSpineItemFromPlace$(
    place: NarrationPlace,
  ): Observable<PlaybackUnderWay> {
    if (isPlaceOnUnit(place)) return this.playSpineItemNarrationFromUnit$(place)

    const { spineItemIndex } = place
    const spineItem = this.reader.spineItemsManager.get(spineItemIndex)

    if (!spineItem) return EMPTY

    return this.askSourcesForNarrationOfSpineItem$(spineItem).pipe(
      switchMap((spineItemNarration) => {
        const firstUnit = spineItemNarration?.units[0]

        return spineItemNarration && firstUnit
          ? this.playSpineItemNarrationFromUnit$({
              spineItemNarration,
              activeUnit: { cfi: firstUnit.cfi, spineItemIndex, unitIndex: 0 },
            })
          : EMPTY
      }),
      startWith<PlaybackUnderWay>({ status: "loading", place }),
    )
  }

  /**
   * The narration of the first source that has units for the spine item, in
   * the order of the sources. A source is asked only when those before it
   * have nothing.
   */
  private askSourcesForNarrationOfSpineItem$(
    spineItem: SpineItem,
  ): Observable<SpineItemNarration | undefined> {
    return from(this.sources).pipe(
      concatMap((source) =>
        source
          .getNarrationOfSpineItem({ reader: this.reader, spineItem })
          .pipe(reportErrorOfTeardown(), take(1)),
      ),
      first(
        (spineItemNarration) =>
          !!spineItemNarration && spineItemNarration.units.length > 0,
        undefined,
      ),
    )
  }

  /**
   * The states of the playback of the units of one spine item, from the
   * active unit of `place`: the units are known, and that one is not heard
   * yet.
   */
  private playSpineItemNarrationFromUnit$({
    spineItemNarration,
    activeUnit: firstUnitToHear,
  }: NarrationPlaceOnUnit): Observable<PlaybackUnderWay> {
    const { spineItemIndex } = firstUnitToHear

    return defer(() =>
      spineItemNarration.play({ startUnitIndex: firstUnitToHear.unitIndex }),
    ).pipe(
      reportErrorOfTeardown(),
      concatMap(({ unitIndex }) => {
        const unit = spineItemNarration.units[unitIndex]

        return unit
          ? of<PlaybackUnderWay>({
              status: "playing",
              place: {
                spineItemNarration,
                activeUnit: { cfi: unit.cfi, spineItemIndex, unitIndex },
              },
            })
          : EMPTY
      }),
      startWith<PlaybackUnderWay>({
        status: "loading",
        place: { spineItemNarration, activeUnit: firstUnitToHear },
      }),
    )
  }
}
