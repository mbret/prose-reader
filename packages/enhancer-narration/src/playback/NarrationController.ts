import {
  isShallowEqual,
  type Reader,
  reportRecoveredError,
  type SpineItem,
} from "@prose-reader/core"
import {
  BehaviorSubject,
  catchError,
  defaultIfEmpty,
  defer,
  distinctUntilChanged,
  first,
  map,
  materialize,
  type Observable,
  type ObservableNotification,
  of,
  Subject,
  type Subscription,
  scan,
  startWith,
  switchMap,
  switchScan,
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

/** The place the narration is at, or resumes from. */
type NarrationPosition = {
  spineItemIndex: number
  unitIndex: number
  /**
   * What a source narrates of the spine item. `undefined` until the sources
   * were asked: the units of the spine item are not known before.
   */
  narration: SpineItemNarration | undefined
}

/** The narration has a place: it is heard, or it can resume. */
type StartedPlaybackState = {
  status: "loading" | "playing" | "paused"
  position: NarrationPosition
  hasError: boolean
}

type PlaybackState =
  | { status: "idle"; position: undefined; hasError: false }
  | StartedPlaybackState

/** How far the playback of the units of one spine item went. */
type PlaybackOfSpineItem = {
  playbackState: StartedPlaybackState
  isLastUnitHeard: boolean
}

const idlePlaybackState: PlaybackState = {
  status: "idle",
  position: undefined,
  hasError: false,
}

const getActiveUnitAtPosition = ({
  narration,
  spineItemIndex,
  unitIndex,
}: NarrationPosition): NarrationActiveUnit | undefined => {
  const unit = narration?.units[unitIndex]

  return unit
    ? { cfi: unit.cfi, spineItemIndex, indexInSpineItem: unitIndex }
    : undefined
}

const playbackStateToNarrationState = (
  playbackState: PlaybackState,
): NarrationState => {
  if (playbackState.status === "idle") {
    return { status: "idle", activeUnit: undefined, hasError: false }
  }

  const { status, hasError, position } = playbackState
  const activeUnit = getActiveUnitAtPosition(position)

  if (status === "playing") {
    // A playing state is only made for a unit of the narration, so the active
    // unit exists. `loading` is what the state would mean without one.
    return activeUnit
      ? { status, activeUnit, hasError }
      : { status: "loading", activeUnit, hasError }
  }

  return { status, activeUnit, hasError }
}

const isSameNarrationState = (
  previous: NarrationState,
  current: NarrationState,
) =>
  previous.status === current.status &&
  previous.hasError === current.hasError &&
  isShallowEqual(previous.activeUnit, current.activeUnit)

export class NarrationController {
  private readonly commandSubject = new Subject<NarrationCommand>()
  private readonly stateSubject = new BehaviorSubject<NarrationState>(
    playbackStateToNarrationState(idlePlaybackState),
  )
  private readonly stateSubscription: Subscription

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
    this.stateSubscription = this.commandSubject
      .pipe(
        switchScan(
          (playbackState, command) =>
            this.getPlaybackStatesAfterCommand(playbackState, command),
          idlePlaybackState,
        ),
        // The state before the first command, so that a first state equal to
        // it is not emitted again.
        startWith(idlePlaybackState),
        map(playbackStateToNarrationState),
        distinctUntilChanged(isSameNarrationState),
      )
      .subscribe(this.stateSubject)
  }

  public get state() {
    return this.stateSubject.value
  }

  public play() {
    const { status } = this.state

    // The command would replace the playback that is already under way, and
    // its sound would start again.
    if (status === "playing" || status === "loading") return

    this.commandSubject.next("play")
  }

  public pause() {
    this.commandSubject.next("pause")
  }

  public stop() {
    this.commandSubject.next("stop")
  }

  public destroy() {
    this.stateSubscription.unsubscribe()
    this.commandSubject.complete()
    this.stateSubject.complete()
  }

  private getPlaybackStatesAfterCommand(
    playbackState: PlaybackState,
    command: NarrationCommand,
  ): Observable<PlaybackState> {
    if (command === "stop") return of(idlePlaybackState)

    if (command === "pause") {
      return of(
        playbackState.status === "idle"
          ? playbackState
          : { ...playbackState, status: "paused" },
      )
    }

    return this.narrateFromPosition$(
      playbackState.position ?? this.getPositionOfFirstVisibleSpineItem(),
    )
  }

  private getPositionOfFirstVisibleSpineItem(): NarrationPosition {
    return {
      spineItemIndex: this.reader.pagination.state.begin.spineItemIndex ?? 0,
      unitIndex: 0,
      narration: undefined,
    }
  }

  /**
   * The states of a playback that starts at `position` and goes on through
   * the following spine items, to the end of the book.
   */
  private narrateFromPosition$(
    position: NarrationPosition,
  ): Observable<PlaybackState> {
    const spineItem = this.reader.spineItemsManager.get(position.spineItemIndex)

    // Past the last spine item: the book is over.
    if (!spineItem) return of(idlePlaybackState)

    const narration$ = position.narration
      ? of(position.narration)
      : this.getNarrationOfSpineItem$(spineItem)

    return narration$.pipe(
      switchMap((narration) =>
        narration
          ? this.playNarrationFromPosition$({ ...position, narration })
          : this.narrateFromStartOfNextSpineItem$(position),
      ),
      startWith<PlaybackState>({
        status: "loading",
        position,
        hasError: false,
      }),
    )
  }

  private narrateFromStartOfNextSpineItem$({
    spineItemIndex,
  }: NarrationPosition) {
    return this.narrateFromPosition$({
      spineItemIndex: spineItemIndex + 1,
      unitIndex: 0,
      narration: undefined,
    })
  }

  /**
   * The narration of the first source that has units for the spine item,
   * `undefined` when none has.
   */
  private getNarrationOfSpineItem$(
    spineItem: SpineItem,
  ): Observable<SpineItemNarration | undefined> {
    return this.sources.reduce<Observable<SpineItemNarration | undefined>>(
      (narrationOfPreviousSources$, source) =>
        narrationOfPreviousSources$.pipe(
          switchMap((narration) =>
            narration
              ? of(narration)
              : this.getNarrationOfSpineItemFromSource$(source, spineItem),
          ),
        ),
      of(undefined),
    )
  }

  private getNarrationOfSpineItemFromSource$(
    source: NarrationSource,
    spineItem: SpineItem,
  ): Observable<SpineItemNarration | undefined> {
    return defer(() =>
      source.getNarrationOfSpineItem({ reader: this.reader, spineItem }),
    ).pipe(
      defaultIfEmpty(undefined),
      first(),
      map((narration) =>
        narration && narration.units.length > 0 ? narration : undefined,
      ),
      // A source that fails has nothing for the spine item. The next source
      // is asked, and the app sees the error where it sees the reader's own.
      catchError((error: unknown) => {
        reportRecoveredError(error)

        return of(undefined)
      }),
    )
  }

  /**
   * The states of the playback of one spine item, then of the following ones
   * once its last unit was heard.
   */
  private playNarrationFromPosition$(
    position: NarrationPosition & { narration: SpineItemNarration },
  ): Observable<PlaybackState> {
    const { narration } = position

    return defer(() =>
      narration.play({ startUnitIndex: position.unitIndex }),
    ).pipe(
      tap({ error: reportRecoveredError }),
      // The end and the error of the source become values, so that the state
      // they lead to is made from the latest position, as every other state.
      materialize(),
      scan(
        (
          latest: PlaybackOfSpineItem,
          notification: ObservableNotification<NarrationProgress>,
        ): PlaybackOfSpineItem => {
          if (notification.kind === "C") {
            return { ...latest, isLastUnitHeard: true }
          }

          if (notification.kind === "E") {
            return {
              ...latest,
              playbackState: {
                ...latest.playbackState,
                status: "paused",
                hasError: true,
              },
            }
          }

          const { unitIndex } = notification.value

          // A unit the narration does not have: the report is ignored.
          if (!narration.units[unitIndex]) return latest

          return {
            ...latest,
            playbackState: {
              status: "playing",
              position: { ...position, unitIndex },
              hasError: false,
            },
          }
        },
        {
          playbackState: { status: "loading", position, hasError: false },
          isLastUnitHeard: false,
        },
      ),
      switchMap(({ playbackState, isLastUnitHeard }) =>
        isLastUnitHeard
          ? this.narrateFromStartOfNextSpineItem$(position)
          : of(playbackState),
      ),
    )
  }
}
