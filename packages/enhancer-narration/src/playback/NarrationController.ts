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
  take,
  tap,
} from "rxjs"
import type {
  NarrationActiveUnit,
  NarrationSource,
  NarrationState,
  SpineItemNarration,
} from "../types.ts"
import { getIndexOfStartUnit, type StartUnitOfSpineItem } from "./startUnit.ts"

type NarrationCommand =
  | { type: "play" }
  | { type: "playFromCfi"; cfi: string; spineItemIndex: number }
  | { type: "pause" }
  | { type: "stop" }

/** A unit of what a source narrates of its spine item. */
type NarrationPlaceOnUnit = {
  spineItemNarration: SpineItemNarration
  activeUnit: NarrationActiveUnit
}

/**
 * A spine item whose units are not known, because the sources did not answer
 * yet, with the unit to start with once they are.
 */
type NarrationPlaceInSpineItem = {
  spineItemIndex: number
  startUnit: StartUnitOfSpineItem
}

/** Where the narration is, or resumes from. */
type NarrationPlace = NarrationPlaceOnUnit | NarrationPlaceInSpineItem

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

/**
 * The unit a spine item starts with, once a source gave its units.
 * `undefined` when the narration has no such unit: the spine item has nothing
 * to narrate from there.
 */
const getPlaceOnStartUnit = (
  spineItemNarration: SpineItemNarration,
  { spineItemIndex, startUnit }: NarrationPlaceInSpineItem,
): NarrationPlaceOnUnit | undefined => {
  const unitIndex = getIndexOfStartUnit(spineItemNarration.units, startUnit)
  const unit =
    unitIndex === undefined ? undefined : spineItemNarration.units[unitIndex]

  return unit && unitIndex !== undefined
    ? {
        spineItemNarration,
        activeUnit: { cfi: unit.cfi, spineItemIndex, unitIndex },
      }
    : undefined
}

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
            command.type === "play" &&
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
    this.commandSubject.next({ type: "play" })
  }

  public playFromCfi(cfi: string) {
    const spineItem = this.reader.cfi.getSpineItemFromCfi(cfi)

    // A cfi of no spine item of the book: there is nothing to play, and the
    // command would only stop the playback under way.
    if (!spineItem) return

    this.commandSubject.next({
      type: "playFromCfi",
      cfi,
      spineItemIndex: spineItem.index,
    })
  }

  public pause() {
    this.commandSubject.next({ type: "pause" })
  }

  public stop() {
    this.commandSubject.next({ type: "stop" })
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
    switch (command.type) {
      case "stop":
        return of(idlePlaybackState)
      case "pause":
        return of(
          isPlaybackUnderWay(playbackState)
            ? { status: "paused", hasError: false, place: playbackState.place }
            : playbackState,
        )
      case "play":
        return this.narrateFromPlace$(
          playbackState.status === "idle"
            ? this.getPlaceOfFirstVisibleCharacter()
            : playbackState.place,
        )
      case "playFromCfi":
        return this.narrateFromPlace$(
          this.getPlaceOfCfi(command, playbackState),
        )
    }
  }

  /**
   * Where a first start begins: with the first unit that starts on the first
   * visible page. A unit that started on the page before is left out, so that
   * the narration does not begin with text the page does not show.
   */
  private getPlaceOfFirstVisibleCharacter(): NarrationPlaceInSpineItem {
    const pagination = this.reader.pagination.state
    const spineItemIndex = pagination.begin.spineItemIndex ?? 0

    return {
      spineItemIndex,
      // Until the pagination settles, its cfi can still be the one of the
      // page shown before.
      startUnit: pagination.isSettled
        ? { type: "firstStartingAtOrAfterCfi", cfi: pagination.begin.cfi }
        : { type: "first" },
    }
  }

  /**
   * The unit that holds the cfi. The narration of the spine item the
   * narration is on is used again: its source is not asked a second time.
   */
  private getPlaceOfCfi(
    { cfi, spineItemIndex }: { cfi: string; spineItemIndex: number },
    playbackState: PlaybackState,
  ): NarrationPlace {
    const startUnit: StartUnitOfSpineItem = { type: "holdingCfi", cfi }
    const placeInSpineItem = { spineItemIndex, startUnit }

    if (
      playbackState.status === "idle" ||
      !isPlaceOnUnit(playbackState.place) ||
      playbackState.place.activeUnit.spineItemIndex !== spineItemIndex
    ) {
      return placeInSpineItem
    }

    return (
      getPlaceOnStartUnit(
        playbackState.place.spineItemNarration,
        placeInSpineItem,
      ) ?? placeInSpineItem
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
      Math.max(this.reader.spineItemsManager.items.length - spineItemIndex, 0),
    ).pipe(
      concatMap((indexOfSpineItemToNarrate) =>
        indexOfSpineItemToNarrate === spineItemIndex
          ? // The command applies at once: nothing delays its first spine item.
            this.narrateSpineItemFromPlace$(place)
          : this.narrateSpineItemFromPlace$({
              spineItemIndex: indexOfSpineItemToNarrate,
              startUnit: { type: "first" },
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

    const spineItem = this.reader.spineItemsManager.get(place.spineItemIndex)

    if (!spineItem) return EMPTY

    return this.askSourcesForNarrationOfSpineItem$(spineItem).pipe(
      switchMap((spineItemNarration) => {
        const placeOnStartUnit =
          spineItemNarration && getPlaceOnStartUnit(spineItemNarration, place)

        return placeOnStartUnit
          ? this.playSpineItemNarrationFromUnit$(placeOnStartUnit)
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
        defer(() =>
          source.getNarrationOfSpineItem({ reader: this.reader, spineItem }),
        ).pipe(take(1)),
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
