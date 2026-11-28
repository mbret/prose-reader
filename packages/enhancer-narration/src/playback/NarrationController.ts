import {
  isShallowEqual,
  type Reader,
  reportRecoveredError,
  type SpineItem,
} from "@prose-reader/core"
import {
  BehaviorSubject,
  catchError,
  concat,
  concatMap,
  defaultIfEmpty,
  defer,
  distinctUntilChanged,
  EMPTY,
  filter,
  first,
  map,
  materialize,
  type Observable,
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
  takeWhile,
  tap,
} from "rxjs"
import type {
  NarrationActiveUnit,
  NarrationProgress,
  NarrationSource,
  NarrationState,
  SpineItemNarration,
} from "../types.ts"

type NarrationCommand = "play" | "pause" | "stop"

/** Where the narration is, or resumes from. */
type NarrationPlace = {
  spineItemIndex: number
  /**
   * What a source narrates of the spine item. `undefined` until the sources
   * answered: the units of the spine item are not known before.
   */
  narration: SpineItemNarration | undefined
  /** The unit of `narration` the narration is on. */
  activeUnit: NarrationActiveUnit | undefined
}

type PlaybackState =
  | { status: "idle" }
  | ({ status: "loading" } & NarrationPlace)
  | {
      status: "playing"
      spineItemIndex: number
      narration: SpineItemNarration
      activeUnit: NarrationActiveUnit
    }
  | ({ status: "paused"; hasError: boolean } & NarrationPlace)

type AnswerOfSources = {
  narration: SpineItemNarration | undefined
  /** Whether a source that was asked failed to answer. */
  hasSourceFailed: boolean
}

const idlePlaybackState: PlaybackState = { status: "idle" }

const playbackStateToNarrationState = (
  playbackState: PlaybackState,
): NarrationState => {
  switch (playbackState.status) {
    case "idle":
      return { status: "idle", activeUnit: undefined }
    case "loading":
      return { status: "loading", activeUnit: playbackState.activeUnit }
    case "playing":
      return { status: "playing", activeUnit: playbackState.activeUnit }
    case "paused":
      return {
        status: "paused",
        activeUnit: playbackState.activeUnit,
        hasError: playbackState.hasError,
      }
  }
}

const isSameNarrationState = (
  previous: NarrationState,
  current: NarrationState,
) =>
  previous.status === current.status &&
  isShallowEqual(previous.activeUnit, current.activeUnit) &&
  (previous.status === "paused" && previous.hasError) ===
    (current.status === "paused" && current.hasError)

const isPausedOnError = (playbackState: PlaybackState) =>
  playbackState.status === "paused" && playbackState.hasError

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
          !this.wouldCommandRestartPlaybackUnderWay(
            command,
            // The state the previous command led to, delivered or not yet.
            this.playbackStateSubject.value,
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

  /**
   * A `play` replaces the playback under way as every command does, and the
   * sound of that playback would start again.
   */
  private wouldCommandRestartPlaybackUnderWay(
    command: NarrationCommand,
    { status }: PlaybackState,
  ) {
    return command === "play" && (status === "playing" || status === "loading")
  }

  private getPlaybackStatesAfterCommand$(
    playbackState: PlaybackState,
    command: NarrationCommand,
  ): Observable<PlaybackState> {
    if (command === "stop") return of(idlePlaybackState)

    if (command === "pause") {
      if (playbackState.status === "idle" || playbackState.status === "paused")
        return of(playbackState)

      const { spineItemIndex, narration, activeUnit } = playbackState

      return of({
        status: "paused",
        hasError: false,
        spineItemIndex,
        narration,
        activeUnit,
      })
    }

    return this.narrateFromPlace$(
      playbackState.status === "idle"
        ? this.getStartOfFirstVisibleSpineItem()
        : playbackState,
    )
  }

  private getStartOfFirstVisibleSpineItem(): NarrationPlace {
    return this.getStartOfSpineItem(
      this.reader.pagination.state.begin.spineItemIndex ?? 0,
    )
  }

  private getStartOfSpineItem(spineItemIndex: number): NarrationPlace {
    return { spineItemIndex, narration: undefined, activeUnit: undefined }
  }

  /**
   * The states of a playback that starts at `place` and goes on through the
   * following spine items. It ends `idle` after the last one, or paused where
   * a source failed.
   */
  private narrateFromPlace$({
    spineItemIndex,
    narration,
    activeUnit,
  }: NarrationPlace): Observable<PlaybackState> {
    const numberOfSpineItemsFromPlace = Math.max(
      this.reader.spineItemsManager.items.length - spineItemIndex,
      0,
    )

    return concat(
      range(spineItemIndex, numberOfSpineItemsFromPlace).pipe(
        concatMap((indexOfSpineItemToNarrate) =>
          this.narrateSpineItemFromPlace$(
            indexOfSpineItemToNarrate === spineItemIndex
              ? { spineItemIndex, narration, activeUnit }
              : this.getStartOfSpineItem(indexOfSpineItemToNarrate),
          ).pipe(
            // A spine item with nothing to narrate can end as soon as it is
            // subscribed to, and a book can have thousands in a row. Through
            // the queue, the next one starts once the previous one returned,
            // not inside it: the stack does not grow with the spine items.
            subscribeOn(queueScheduler),
          ),
        ),
      ),
      of(idlePlaybackState),
    ).pipe(takeWhile((playbackState) => !isPausedOnError(playbackState), true))
  }

  /**
   * The states of the playback of one spine item. It completes once its last
   * unit was heard, or at once when no source has units for it.
   */
  private narrateSpineItemFromPlace$(
    place: NarrationPlace,
  ): Observable<PlaybackState> {
    const spineItem = this.reader.spineItemsManager.get(place.spineItemIndex)

    if (!spineItem) return EMPTY

    const answerOfSources$: Observable<AnswerOfSources> = place.narration
      ? of({ narration: place.narration, hasSourceFailed: false })
      : this.askSourcesForNarrationOfSpineItem$(spineItem)

    return answerOfSources$.pipe(
      switchMap(({ narration, hasSourceFailed }) => {
        if (narration) {
          return this.playNarrationFromUnit$({
            spineItemIndex: place.spineItemIndex,
            narration,
            startUnitIndex: place.activeUnit?.unitIndex ?? 0,
          })
        }

        // A source that failed may have units for the spine item: skipping it
        // would skip the whole book while the source is unreachable.
        return hasSourceFailed
          ? of<PlaybackState>({ status: "paused", hasError: true, ...place })
          : EMPTY
      }),
      startWith<PlaybackState>({ status: "loading", ...place }),
    )
  }

  /**
   * The narration of the first source that has units for the spine item, in
   * the order of the sources.
   */
  private askSourcesForNarrationOfSpineItem$(
    spineItem: SpineItem,
  ): Observable<AnswerOfSources> {
    return this.sources.reduce<Observable<AnswerOfSources>>(
      (answerOfPreviousSources$, source) =>
        answerOfPreviousSources$.pipe(
          switchMap((answerOfPreviousSources) =>
            answerOfPreviousSources.narration
              ? of(answerOfPreviousSources)
              : this.askSourceForNarrationOfSpineItem$(source, spineItem).pipe(
                  map((answerOfSource) => ({
                    narration: answerOfSource.narration,
                    hasSourceFailed:
                      answerOfPreviousSources.hasSourceFailed ||
                      answerOfSource.hasSourceFailed,
                  })),
                ),
          ),
        ),
      of({ narration: undefined, hasSourceFailed: false }),
    )
  }

  private askSourceForNarrationOfSpineItem$(
    source: NarrationSource,
    spineItem: SpineItem,
  ): Observable<AnswerOfSources> {
    return defer(() =>
      source.getNarrationOfSpineItem({ reader: this.reader, spineItem }),
    ).pipe(
      defaultIfEmpty(undefined),
      first(),
      map((narration) => ({
        narration:
          narration && narration.units.length > 0 ? narration : undefined,
        hasSourceFailed: false,
      })),
      // The next source is asked, and the app sees the error where it sees
      // the reader's own.
      catchError((error: unknown) => {
        reportRecoveredError(error)

        return of({ narration: undefined, hasSourceFailed: true })
      }),
    )
  }

  /**
   * The states of the playback of the units of one spine item, from the unit
   * at `startUnitIndex`. It completes once the source did, and pauses on the
   * unit the narration was on when the source fails.
   */
  private playNarrationFromUnit$({
    spineItemIndex,
    narration,
    startUnitIndex,
  }: {
    spineItemIndex: number
    narration: SpineItemNarration
    startUnitIndex: number
  }): Observable<PlaybackState> {
    const getActiveUnitAtIndex = (
      unitIndex: number,
    ): NarrationActiveUnit | undefined => {
      const unit = narration.units[unitIndex]

      return unit ? { cfi: unit.cfi, spineItemIndex, unitIndex } : undefined
    }

    // The units are known, and the first one is not heard yet.
    const playbackStateBeforeFirstUnitIsHeard: PlaybackState & NarrationPlace =
      {
        status: "loading",
        spineItemIndex,
        narration,
        activeUnit: getActiveUnitAtIndex(startUnitIndex),
      }

    return defer(() => narration.play({ startUnitIndex })).pipe(
      tap({ error: reportRecoveredError }),
      // The error of the source becomes a value, so that the state it leads
      // to is made from the latest one, as every other state.
      materialize(),
      scan(
        (
          latestPlaybackState: PlaybackState & NarrationPlace,
          notification: ObservableNotification<NarrationProgress>,
        ): PlaybackState & NarrationPlace => {
          if (notification.kind === "C") return latestPlaybackState

          if (notification.kind === "E") {
            return {
              status: "paused",
              hasError: true,
              spineItemIndex,
              narration,
              activeUnit: latestPlaybackState.activeUnit,
            }
          }

          const activeUnit = getActiveUnitAtIndex(notification.value.unitIndex)

          // A unit the narration does not have: the report is ignored.
          return activeUnit
            ? { status: "playing", spineItemIndex, narration, activeUnit }
            : latestPlaybackState
        },
        playbackStateBeforeFirstUnitIsHeard,
      ),
      startWith(playbackStateBeforeFirstUnitIsHeard),
    )
  }
}
