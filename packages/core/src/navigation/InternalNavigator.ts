import {
  BehaviorSubject,
  distinctUntilChanged,
  filter,
  finalize,
  first,
  identity,
  map,
  merge,
  type Observable,
  of,
  share,
  shareReplay,
  startWith,
  switchMap,
  takeUntil,
  tap,
  withLatestFrom,
} from "rxjs"
import type { CfiManager } from "../cfi"
import type { Context } from "../context/Context"
import type { PaginationInfo } from "../pagination/types"
import { Report } from "../report"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import type { Spine } from "../spine/Spine"
import { SpinePosition } from "../spine/types"
import { DestroyableClass } from "../utils/DestroyableClass"
import type { Viewport } from "../viewport/Viewport"
import { mapUserNavigationToInternal } from "./consolidation/mapUserNavigationToInternal"
import { withCfiPosition } from "./consolidation/withCfiPosition"
import { withDirection } from "./consolidation/withDirection"
import { withFallbackPosition } from "./consolidation/withFallbackPosition"
import { withSpineItem } from "./consolidation/withSpineItem"
import { withSpineItemLayoutInfo } from "./consolidation/withSpineItemLayoutInfo"
import { withSpineItemPosition } from "./consolidation/withSpineItemPosition"
import { withUrlInfo } from "./consolidation/withUrlInfo"
import { Locker } from "./Locker"
import type { createNavigationResolver } from "./resolvers/NavigationResolver"
import { withRestoredPosition } from "./restoration/withRestoredPosition"
import type {
  InternalNavigationEntry,
  NavigationAnchor,
  NavigationModeController,
  UserNavigationEntry,
} from "./types"

const NAMESPACE = `navigation/InternalNavigator`

const report = Report.namespace(NAMESPACE)

const isSettled = (
  pagination: PaginationInfo,
): pagination is Extract<PaginationInfo, { isSettled: true }> =>
  pagination.isSettled

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
   * Each navigation's anchor: the first visible position of the first result
   * that settled for it. A restoration keeps its navigation, so the page it
   * lands on does not move the anchor. Anchoring on the restored page's own
   * first character would restore to the page before it at the next relayout,
   * and every resize would walk the reader backwards.
   */
  protected anchor$: Observable<NavigationAnchor | undefined>

  /**
   * Where the reader is in the book, to save and reopen at. It is the cfi the
   * current navigation asked for when it named one, and otherwise its anchor,
   * so it only moves when the reader navigates: a relayout reflows the page
   * around it without changing it. Until a navigation without a cfi settles,
   * the previous one stands, so a precise position is never traded for a
   * placeholder.
   */
  public readonly readingPosition$: Observable<string>

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
     * While held, automatic position adjustments (correction, restoration)
     * are deferred so they don't fight the user's direct manipulation.
     */
    protected isUserInteractionLocked$: Observable<boolean>,
  ) {
    super()

    this.anchor$ = context.bridgeEvent.pagination$.pipe(
      filter(isSettled),
      /**
       * The navigation current now, not the latest this stream heard of: a
       * result can settle synchronously inside its navigation's own
       * notification, before later listeners have heard of that navigation.
       * Pagination cancels a pending result on every navigation, so one that
       * settles belongs to the current navigation.
       */
      map((pagination) => ({
        id: this.navigation.id,
        cfi: pagination.begin.cfi,
      })),
      distinctUntilChanged((previous, anchor) => previous.id === anchor.id),
      startWith(undefined),
      shareReplay({ bufferSize: 1, refCount: false }),
    )

    this.readingPosition$ = this.navigationSubject.pipe(
      distinctUntilChanged(
        (previous, navigation) => previous.id === navigation.id,
      ),
      switchMap(({ id, cfi }) =>
        cfi !== undefined
          ? of(cfi)
          : this.anchor$.pipe(
              filter((anchor) => anchor?.id === id),
              map((anchor) => anchor?.cfi),
              filter((anchorCfi) => anchorCfi !== undefined),
            ),
      ),
      distinctUntilChanged(),
      shareReplay({ bufferSize: 1, refCount: false }),
    )

    const getNavigationVisibleArea = () =>
      getActiveNavigationModeController().getNavigationVisibleArea()

    const navigationFromUser$ = userNavigation$
      .pipe(
        withLatestFrom(this.navigationSubject),
        mapUserNavigationToInternal({
          navigationResolver,
          getNavigationVisibleArea,
        }),
        /**
         * Url lookup is heavier so we start with it to fill
         * as much information as needed to reduce later lookup
         */
        withUrlInfo({
          navigationResolver,
        }),
        /**
         * Cfi lookup is heavier so we start with it to fill
         * as much information as needed to reduce later lookup
         */
        withCfiPosition({
          navigationResolver,
        }),
        withDirection({ context, settings }),
        withSpineItem({
          context,
          cfi: cfiManager,
          navigationResolver,
          settings,
          spineItemsManager: spine.spineItemsManager,
          spineLocator: spine.locator,
        }),
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
        withLatestFrom(isUserInteractionLocked$),
        switchMap(([params, isUserLocked]) => {
          const shouldNotAlterPosition =
            params.navigation.cfi ||
            params.navigation.url ||
            settings.values.computedPageTurnMode === "scrollable" ||
            isUserLocked

          return of(params).pipe(
            shouldNotAlterPosition
              ? identity
              : withRestoredPosition({
                  navigationResolver,
                  settings,
                  spine,
                  context,
                  cfiManager,
                  anchor$: this.anchor$,
                }),
          )
        }),
        withSpineItemPosition({
          spineItemsManager: spine.spineItemsManager,
          spineLocator: spine.locator,
          settings,
          navigationResolver,
        }),
        map((params) => params.navigation),
        share(),
      )

    const navigationUpdateFollowingUserUnlock$ = navigationFromUser$.pipe(
      withLatestFrom(isUserInteractionLocked$),
      filter(([, isUserLocked]) => isUserLocked),
      switchMap(([navigation]) => {
        // @todo emit true/false to keep stream pure
        const unlock = this.locker.lock()

        return isUserInteractionLocked$.pipe(
          filter((isUserLocked) => !isUserLocked),
          first(),
          map(() => ({
            navigation: {
              ...navigation,
              animation: "snap" as const,
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
      switchMap(() => {
        return of(null).pipe(
          switchMap(() =>
            isUserInteractionLocked$.pipe(
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
          takeUntil(
            merge(navigationUpdateFollowingUserUnlock$, navigationFromUser$),
          ),
        )
      }),
    )

    const navigationRestored$ = merge(
      navigationUpdateFromLayout$,
      navigationUpdateFollowingUserUnlock$,
    ).pipe(
      withRestoredPosition({
        navigationResolver,
        settings,
        context,
        spine,
        cfiManager,
        anchor$: this.anchor$,
      }),
      map(({ navigation }) => {
        const updated: InternalNavigationEntry = {
          ...navigation,
          meta: {
            triggeredBy: `restoration`,
          },
          requestedPosition: navigation.position,
        }

        return { navigation: updated }
      }),
      /**
       * The spine item may be undefined after a restoration.
       * eg: after the reader load and the user has never navigated
       * yet.
       */
      withSpineItem({
        context,
        cfi: cfiManager,
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
      map(({ navigation }) => navigation),
      share(),
    )

    const navigationUpdate$ = merge(navigationRestored$, navigationFromUser$)

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

    // The anchors and the reading position are kept whether or not anything
    // listens, so they are known the moment they are asked for.
    merge(this.anchor$, this.readingPosition$, notifiedNavigationUpdate$)
      .pipe(takeUntil(this.destroy$))
      .subscribe()
  }

  get navigation() {
    return this.navigationSubject.getValue()
  }
}
