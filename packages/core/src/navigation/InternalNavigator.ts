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
  switchMap,
  takeUntil,
  tap,
  withLatestFrom,
} from "rxjs"
import type { CfiManager } from "../cfi"
import type { Context } from "../context/Context"
import { Report } from "../report"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import type { Spine } from "../spine/Spine"
import { SpinePosition, type UnboundSpinePosition } from "../spine/types"
import { DestroyableClass } from "../utils/DestroyableClass"
import type { Viewport } from "../viewport/Viewport"
import { consolidateWithPagination } from "./consolidation/consolidateWithPagination"
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
  Navigation,
  NavigationModeController,
  NavigationVisibleArea,
  UserNavigationEntry,
} from "./types"

const NAMESPACE = `navigation/InternalNavigator`

const report = Report.namespace(NAMESPACE)

const isSamePosition = (
  a: SpinePosition | UnboundSpinePosition | undefined,
  b: SpinePosition | UnboundSpinePosition | undefined,
) => a === b || (!!a && !!b && a.x === b.x && a.y === b.y)

const isSameVisibleArea = (
  a: NavigationVisibleArea | undefined,
  b: NavigationVisibleArea | undefined,
) => a === b || (!!a && !!b && a.width === b.width && a.height === b.height)

const isSameNavigation = (a: Navigation, b: Navigation) =>
  a.id === b.id &&
  isSamePosition(a.position, b.position) &&
  isSamePosition(a.requestedPosition, b.requestedPosition) &&
  isSameVisibleArea(a.requestedVisibleArea, b.requestedVisibleArea)

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

  public navigation$ = this.navigationSubject.pipe(
    map(({ position, id, requestedPosition, requestedVisibleArea, meta }) => ({
      position,
      id,
      requestedPosition,
      requestedVisibleArea,
      triggeredBy: meta.triggeredBy,
    })),
    distinctUntilChanged(isSameNavigation),
    shareReplay(1),
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
     * While held, automatic position adjustments (correction, restoration)
     * are deferred so they don't fight the user's direct manipulation.
     */
    protected isUserInteractionLocked$: Observable<boolean>,
  ) {
    super()

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

    // @todo export
    // @todo we should only update the cfi if the content of the
    // item change, because otherwise every time the viewport get bigger
    // the pagination cfi will change and thus this one too, indefinitely
    // pulling the user back since we always use the first visible node
    const navigationUpdateOnPaginationUpdate$ = consolidateWithPagination(
      context,
      this.navigationSubject,
      spine,
    )

    const navigationUpdate$ = merge(
      navigationRestored$,
      navigationFromUser$,
      navigationUpdateOnPaginationUpdate$,
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
          const isPaginationUpdate =
            currentNavigation.meta.triggeredBy === "pagination"
          const isRestoration =
            currentNavigation.meta.triggeredBy === "restoration"

          // Do NOT add a `position`-equality short-circuit here: the same
          // spine position can map to a different DOM scroll target after
          // a scale change, layout reflow, or external scroll drift. Only
          // the controller owns surface state — let it dedup.
          if ((isScrollFromUser && !isRestoration) || isPaginationUpdate) return

          const navigation = {
            position: currentNavigation.position,
            animation: currentNavigation.animation,
          }

          this.getActiveNavigationModeController().navigate(navigation)
        }),
      )

    navigationUpdate$
      .pipe(
        withLatestFrom(this.navigationSubject),
        /**
         * @important
         *
         * We need to start navigation before notifying navigation change, this
         * keeps navigationState sync and avoids a "free" ping in between.
         */
        navigateActiveModeController,
        notifyNavigationUpdate,
        takeUntil(this.destroy$),
      )
      .subscribe()
  }

  get navigation() {
    return this.navigationSubject.getValue()
  }
}
