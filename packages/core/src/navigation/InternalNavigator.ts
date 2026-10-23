import { isShallowEqual } from "@prose-reader/shared"
import {
  BehaviorSubject,
  distinctUntilChanged,
  filter,
  finalize,
  first,
  map,
  merge,
  type Observable,
  of,
  scan,
  share,
  shareReplay,
  skip,
  skipUntil,
  switchMap,
  take,
  takeUntil,
  tap,
  withLatestFrom,
} from "rxjs"
import type { CfiManager } from "../cfi"
import type { Context } from "../context/Context"
import { Report } from "../report"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import type { Spine } from "../spine/Spine"
import { SpinePosition } from "../spine/types"
import { DestroyableClass } from "../utils/DestroyableClass"
import { isDefined } from "../utils/isDefined"
import type { Viewport } from "../viewport/Viewport"
import { mapUserNavigationToInternal } from "./consolidation/mapUserNavigationToInternal"
import { withAnchor } from "./consolidation/withAnchor"
import { withFallbackPosition } from "./consolidation/withFallbackPosition"
import {
  withAnchorFromTarget,
  withResolvedTarget,
} from "./consolidation/withResolvedTarget"
import { withSnappedPosition } from "./consolidation/withSnappedPosition"
import { withSpineItem } from "./consolidation/withSpineItem"
import { withSpineItemLayoutInfo } from "./consolidation/withSpineItemLayoutInfo"
import { withSpineItemPosition } from "./consolidation/withSpineItemPosition"
import { Locker } from "./Locker"
import type { createNavigationResolver } from "./resolvers/NavigationResolver"
import { withRestoredPosition } from "./restoration/withRestoredPosition"
import { createTargetResolvers } from "./targets/createTargetResolvers"
import { isTargetInBook } from "./targets/isTargetInBook"
import type {
  InternalNavigationAnchor,
  InternalNavigationEntry,
  Navigation,
  NavigationAgainstCurrentLayout,
  NavigationModeController,
  NavigationTarget,
  ReadingPosition,
  UserNavigationEntry,
} from "./types"

const NAMESPACE = `navigation/InternalNavigator`

const report = Report.namespace(NAMESPACE)

/**
 * A stand-in's cfi is its item's root cfi and a target place's never is, so
 * both can be `pending`: every state the anchor moves on to is still a new
 * reading position.
 */
const readingPositionStatusOfAnchorState = {
  standIn: "pending",
  targetPlace: "pending",
  final: "success",
  error: "error",
} satisfies Record<InternalNavigationAnchor["state"], ReadingPosition["status"]>

export class InternalNavigator extends DestroyableClass {
  /**
   * This position correspond to the current navigation position.
   * This is always sync with navigation and adjustment but IS NOT necessarily
   * synced with current viewport. This is because viewport can be animated.
   * This value may be used to adjust / get current valid info about what should be visible.
   * This DOES NOT reflect necessarily what is visible for the user at instant T.
   */
  public navigationSubject = new BehaviorSubject<InternalNavigationEntry>({
    animation: false,
    target: { type: "position", value: new SpinePosition({ x: 0, y: 0 }) },
    position: new SpinePosition({ x: 0, y: 0 }),
    meta: {
      triggeredBy: "user",
    },
    requestedPosition: new SpinePosition({ x: 0, y: 0 }),
    spineItemIsReady: false,
    type: "api",
    id: Symbol("init"),
  })

  /**
   * Every navigation as it happens: a user's, or a restoration re-applying the
   * current one onto a new layout or once the user lets go. A restoration is
   * emitted even when it lands where the navigation already was, because what
   * it tells is that the navigation holds on the new layout, and the same
   * position can show other content once the layout changed. For where the
   * reader is, `position$` only emits when the position changes.
   */
  public navigation$ = this.navigationSubject.pipe(
    map(({ position, id, requestedPosition, requestedVisibleArea, meta }) => ({
      position,
      id,
      requestedPosition,
      requestedVisibleArea,
      triggeredBy: meta.triggeredBy,
    })),
    shareReplay(1),
  )

  /**
   * The latest navigation, and whether it holds on the current layout: made,
   * or restored, while the pages describe the items it shows as the latest
   * layout requested lays them out, with no layout requested since that can
   * change them. It does not hold until the reader is first laid out, nor from
   * the moment a layout that can change what it shows is requested, and still
   * once that layout's pages are published, until the navigation is restored
   * onto them. A layout of the items after the last one it shows leaves it
   * holding: it cannot move the pages the navigation shows. A navigation made
   * while a layout is pending holds only if that layout cannot change what it
   * shows either.
   *
   * A navigation's position and the pages agree only while it holds, so
   * whatever depends on the layout reads it: pagination settles, and the
   * loader measures which items to keep loaded, only then. It is reported
   * with every navigation, and again with the same one when a layout voids
   * it, so a reader of it needs no other navigation stream.
   *
   * Whether a navigation holds depends on the order navigations and layouts
   * came in, not on their latest values: once a layout's pages are published,
   * a navigation it voided is still the latest until it is restored. So it is
   * derived from construction on, and replayed, and is the one to read rather
   * than work out again from `navigation$` and the spine.
   */
  public readonly navigationAgainstCurrentLayout$: Observable<NavigationAgainstCurrentLayout>

  /**
   * Where the reader is in the book, to save and reopen at, the same way
   * whatever the target: the current navigation's anchor, which the target
   * names once its document shows the place and `withAnchor` otherwise finds.
   * Until the anchor is final, the reading position is `pending` and its
   * progression is the start of the item the navigation goes to, and so is
   * its cfi while it stands in, such as while that item loads: the only place
   * a cfi can name there. A target whose document shows it names nothing,
   * such as a cfi whose path leads nowhere, ends on the first character of the
   * page the reader landed on. One whose item fails to load ends in `error`.
   *
   * It only moves when the reader navigates, and again each time the anchor's
   * state moves on, even when its cfi and progression stay the same: a
   * relayout reflows the page around it without changing it. A navigation
   * whose target names nothing in the book, such as a cfi that can't be read,
   * is ignored, and leaves it where it was. One made while `lock()` is held,
   * as by a pan, moves it once the lock is released, to where it lands.
   */
  public readonly readingPosition$: Observable<ReadingPosition> =
    this.navigationSubject.pipe(
      // An entry without a spine item has none, such as the navigator's first.
      map(({ anchor }) => anchor),
      filter(isDefined),
      map(
        ({ cfi, percentageEstimateOfBook, state }): ReadingPosition => ({
          cfi,
          percentageEstimateOfBook,
          status: readingPositionStatusOfAnchorState[state],
        }),
      ),
      distinctUntilChanged(isShallowEqual),
    )

  public locker = new Locker()

  constructor(
    protected settings: ReaderSettingsManager,
    protected context: Context,
    protected userNavigation$: Observable<UserNavigationEntry>,
    protected getActiveNavigationModeController: () => NavigationModeController,
    protected navigationModeLayout$: Observable<unknown>,
    protected navigationResolver: ReturnType<typeof createNavigationResolver>,
    protected spine: Spine,
    protected viewport: Viewport,
    protected cfiManager: CfiManager,
    /**
     * Whether `lock()` is held, as by a pan, the user's scrolling or the app.
     * Meanwhile automatic position adjustments (correction, restoration) are
     * deferred so they don't fight whoever moves the page, and a navigation
     * lands once the lock is released.
     */
    protected isNavigationLocked$: Observable<boolean>,
    /** Where the reader opens, the start of the book by default. */
    initialTarget?: NavigationTarget,
  ) {
    super()

    /**
     * Whether no item from `firstItemIndexAwaitingLayout` on is in view at the
     * navigation's position: a layout of those items leaves it showing the
     * same pages. Any part of an item in view counts, more than pagination
     * needs to count it visible. The viewport is the one laid out, as for
     * pagination: what a zoom shows around it takes a read of the DOM.
     */
    const holdsOver = (
      navigation: Navigation,
      firstItemIndexAwaitingLayout: number | undefined,
    ) => {
      if (firstItemIndexAwaitingLayout === undefined) return true

      const { endIndex } =
        spine.locator.getVisibleSpineItemsFromPosition({
          position: navigation.position,
          threshold: { type: "percentage", value: 0 },
        }) ?? {}

      return endIndex !== undefined && endIndex < firstItemIndexAwaitingLayout
    }

    this.navigationAgainstCurrentLayout$ = merge(
      this.navigation$.pipe(
        map((navigation) => ({ type: "navigation" as const, navigation })),
      ),
      spine.firstItemIndexAwaitingLayout$.pipe(
        // Changes only: the current value is replayed on subscription.
        skip(1),
        map((firstItemIndexAwaitingLayout) => ({
          type: "layoutCurrencyChange" as const,
          firstItemIndexAwaitingLayout,
        })),
      ),
    ).pipe(
      scan<
        | { type: "navigation"; navigation: Navigation }
        | {
            type: "layoutCurrencyChange"
            firstItemIndexAwaitingLayout: number | undefined
          },
        NavigationAgainstCurrentLayout | undefined
      >((latest, event) => {
        if (event.type === "navigation")
          return {
            navigation: event.navigation,
            holdsOnCurrentLayout: holdsOver(
              event.navigation,
              spine.firstItemIndexAwaitingLayout,
            ),
          }

        /**
         * A request voids the navigation once it can change what the
         * navigation shows, and it stays void until the next navigation, a
         * restoration onto the new pages included. Pages being published void
         * nothing: they describe again what a navigation that still holds
         * shows, which no request since has changed.
         */
        return latest?.holdsOnCurrentLayout &&
          !holdsOver(latest.navigation, event.firstItemIndexAwaitingLayout)
          ? { navigation: latest.navigation, holdsOnCurrentLayout: false }
          : latest
      }, undefined),
      filter(isDefined),
      // a change of layout currency that leaves the latest report as it was
      distinctUntilChanged(),
      shareReplay({ bufferSize: 1, refCount: true }),
    )

    // From construction on, so it has seen every navigation and layout.
    this.navigationAgainstCurrentLayout$
      .pipe(takeUntil(this.destroy$))
      .subscribe()

    const getNavigationVisibleArea = () =>
      getActiveNavigationModeController().getNavigationVisibleArea()

    const targetResolvers = createTargetResolvers({
      navigationResolver,
      cfi: cfiManager,
      settings,
      spineItemsManager: spine.spineItemsManager,
      context,
      getNavigationVisibleArea,
    })

    const isInBook = (target: NavigationTarget) =>
      isTargetInBook(target, {
        cfi: cfiManager,
        spineItemsManager: spine.spineItemsManager,
      })

    /**
     * A navigation whose target names nothing in the book, such as a cfi that
     * can't be read, or a cfi or a spine item the book does not have, is
     * ignored: the reader has nowhere to go, and stays where it is. It is
     * dropped before anything hears of it, so it does not replace the first
     * navigation either.
     */
    const userNavigationInBook$ = userNavigation$.pipe(
      filter(({ target }) => {
        if (isInBook(target)) return true

        report.warn(
          `Ignore navigation, its target names nothing in the book`,
          target,
        )

        return false
      }),
      share(),
    )

    const startOfBook: NavigationTarget = {
      type: "position",
      value: new SpinePosition({ x: 0, y: 0 }),
    }

    const getOpeningTarget = () => {
      if (!initialTarget) return startOfBook

      if (isInBook(initialTarget)) return initialTarget

      report.warn(
        `Open at the start of the book, the target names nothing in it`,
        initialTarget,
      )

      return startOfBook
    }

    /**
     * The reader's first navigation, once its items are first laid out: its
     * target resolves against the book's layout, once every enhancer has added
     * its hooks. A target naming nothing in the book opens it at its start, as
     * without one. A navigation asked for before then replaces it.
     */
    const firstNavigation$ = spine.itemsLayout$.pipe(
      take(1),
      map(
        (): UserNavigationEntry => ({
          target: getOpeningTarget(),
          animation: false,
        }),
      ),
      takeUntil(userNavigationInBook$),
    )

    const navigationFromUser$ = merge(firstNavigation$, userNavigationInBook$)
      .pipe(
        withLatestFrom(this.navigationSubject, isNavigationLocked$),
        mapUserNavigationToInternal,
        withResolvedTarget({ resolvers: targetResolvers }),
        withSpineItem({
          navigationResolver,
          settings,
          spineItemsManager: spine.spineItemsManager,
          spineLocator: spine.locator,
        }),
        // From the target's own position, before the fallback: the snap works
        // from it.
        withSpineItemPosition({
          navigationResolver,
          settings,
          spineItemsManager: spine.spineItemsManager,
          spineLocator: spine.locator,
        }),
        withSpineItemLayoutInfo({
          spine,
        }),
      )
      .pipe(
        withFallbackPosition({
          navigationResolver,
          spineItemsManager: spine.spineItemsManager,
          settings,
          viewport,
        }),
        withSnappedPosition({
          navigationResolver,
          settings,
          spine,
        }),
        withSpineItemPosition({
          spineItemsManager: spine.spineItemsManager,
          spineLocator: spine.locator,
          settings,
          navigationResolver,
        }),
        withAnchor({ spine, cfi: cfiManager, context }),
        map(({ navigation, awaitsLockRelease }) => ({
          navigation,
          awaitsLockRelease,
        })),
        share(),
      )

    const navigationUpdateOnLockRelease$ = navigationFromUser$.pipe(
      filter(({ awaitsLockRelease }) => awaitsLockRelease),
      switchMap(({ navigation }) => {
        // @todo emit true/false to keep stream pure
        const unlock = this.locker.lock()

        return isNavigationLocked$.pipe(
          filter((isUserLocked) => !isUserLocked),
          first(),
          map(() => ({
            navigation: {
              ...navigation,
              animation: "snap" as const,
              /**
               * Locked, the navigation kept the anchor of the one it
               * replaced. Released, it lands, and finds its own where it
               * does.
               */
              anchor: undefined,
            },
          })),
          finalize(() => {
            unlock()
          }),
          takeUntil(navigationFromUser$),
        )
      }),
      share(),
    )

    /**
     * Once a layout change happens we want
     * to validate the navigation. Basically we make sure the current navigation
     * is correct for the current layout.
     *
     * @important
     * We want the restoration to happens as fast as possible so it is invisible for the user.
     * Consider the scenario where an item load / unload and create a shift, we want
     * the user to be restored instantly.
     *
     * This means that if a layout happens during navigation, we will cut it and navigate
     * directly to new position. NO layout should happens during viewport busy.
     * This is responsibility of other components.
     */
    const navigationUpdateFromLayout$ = merge(
      navigationModeLayout$,
      spine.layout$,
    ).pipe(
      // Nothing to restore before the first navigation.
      skipUntil(navigationFromUser$),
      switchMap(() => {
        return of(null).pipe(
          switchMap(() =>
            isNavigationLocked$.pipe(
              filter((isLocked) => !isLocked),
              first(),
            ),
          ),
          map(() => ({
            navigation: {
              ...this.navigationSubject.getValue(),
              animation: false as const,
            },
          })),
          /**
           * We need to cancel the restoration as soon as there is
           * another navigation. Whether it's user or internal, it means
           * it has been controlled outside.
           */
          takeUntil(merge(navigationUpdateOnLockRelease$, navigationFromUser$)),
        )
      }),
    )

    const navigationRestored$ = merge(
      navigationUpdateFromLayout$,
      navigationUpdateOnLockRelease$,
    ).pipe(
      withAnchorFromTarget({ resolvers: targetResolvers }),
      withRestoredPosition({
        navigationResolver,
        settings,
        context,
        spine,
        cfiManager,
      }),
      map(({ navigation, ...rest }) => {
        const updated: InternalNavigationEntry = {
          ...navigation,
          meta: {
            triggeredBy: `restoration`,
          },
          requestedPosition: navigation.position,
        }

        return { ...rest, navigation: updated }
      }),
      /**
       * The spine item may be undefined after a restoration.
       * eg: after the reader load and the user has never navigated
       * yet.
       */
      withSpineItem({
        navigationResolver,
        settings,
        spineItemsManager: spine.spineItemsManager,
        spineLocator: spine.locator,
      }),
      withSpineItemLayoutInfo({
        spine,
      }),
      withSpineItemPosition({
        spineItemsManager: spine.spineItemsManager,
        spineLocator: spine.locator,
        settings,
        navigationResolver,
      }),
      withAnchor({ spine, cfi: cfiManager, context }),
      map(({ navigation }) => navigation),
      share(),
    )

    const navigationUpdate$ = merge(
      navigationRestored$,
      navigationFromUser$.pipe(map(({ navigation }) => navigation)),
    )

    const notifyNavigationUpdate = (
      stream: Observable<[InternalNavigationEntry, InternalNavigationEntry]>,
    ) =>
      stream.pipe(
        tap(([currentNavigation, previousNavigation]) => {
          report.info(
            `navigation updated from ${currentNavigation.meta.triggeredBy} of type ${currentNavigation.type}`,
            {
              previousNavigation,
              currentNavigation,
            },
          )

          this.navigationSubject.next(currentNavigation)
        }),
      )

    const navigateActiveModeController = (
      stream: Observable<[InternalNavigationEntry, InternalNavigationEntry]>,
    ) =>
      stream.pipe(
        tap(([currentNavigation]) => {
          const isScrollFromUser = currentNavigation.type === `scroll`
          const isRestoration =
            currentNavigation.meta.triggeredBy === "restoration"

          // Do NOT add a `position`-equality short-circuit here: the same
          // spine position can map to a different DOM scroll target after
          // a scale change, layout reflow, or external scroll drift. Only
          // the controller owns surface state — let it dedup.
          if (isScrollFromUser && !isRestoration) return

          const navigation = {
            position: currentNavigation.position,
            animation: currentNavigation.animation,
          }

          this.getActiveNavigationModeController().navigate(navigation)
        }),
      )

    const notifiedNavigationUpdate$ = navigationUpdate$.pipe(
      withLatestFrom(this.navigationSubject),
      /**
       * @important
       *
       * We need to start navigation before notifying navigation change, this
       * keeps navigationState sync and avoids a "free" ping in between.
       */
      navigateActiveModeController,
      notifyNavigationUpdate,
    )

    notifiedNavigationUpdate$.pipe(takeUntil(this.destroy$)).subscribe()
  }

  get navigation() {
    return this.navigationSubject.getValue()
  }
}
