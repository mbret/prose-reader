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
import { SpinePosition } from "../spine/types"
import { DestroyableClass } from "../utils/DestroyableClass"
import { isDefined } from "../utils/isDefined"
import type { Viewport } from "../viewport/Viewport"
import { mapUserNavigationToInternal } from "./consolidation/mapUserNavigationToInternal"
import { withAnchor } from "./consolidation/withAnchor"
import { withFallbackPosition } from "./consolidation/withFallbackPosition"
import { withResolvedTarget } from "./consolidation/withResolvedTarget"
import { withSnappedPosition } from "./consolidation/withSnappedPosition"
import { withSpineItem } from "./consolidation/withSpineItem"
import { withSpineItemLayoutInfo } from "./consolidation/withSpineItemLayoutInfo"
import { withSpineItemPosition } from "./consolidation/withSpineItemPosition"
import { Locker } from "./Locker"
import type { createNavigationResolver } from "./resolvers/NavigationResolver"
import { withRestoredPosition } from "./restoration/withRestoredPosition"
import { createTargetResolvers } from "./targets/createTargetResolvers"
import type {
  InternalNavigationEntry,
  NavigationModeController,
  UserNavigationEntry,
} from "./types"

const NAMESPACE = `navigation/InternalNavigator`

const report = Report.namespace(NAMESPACE)

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
   * Where the reader is in the book, to save and reopen at: the current
   * navigation's anchor, which a cfi target names and `withAnchor` otherwise
   * finds. Until the page a navigation goes to is laid out it has none, and
   * this is the start of the item the navigation goes to, the only place a
   * cfi can name in content that is not laid out. It only moves when the
   * reader navigates, and once when such a navigation finds its page: a
   * relayout reflows the page around it without changing it.
   */
  public readonly readingPosition$ = this.navigationSubject.pipe(
    map((navigation) => navigation.anchor ?? this.getItemStart(navigation)),
    filter(isDefined),
    distinctUntilChanged(),
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

    const targetResolvers = createTargetResolvers({
      navigationResolver,
      cfi: cfiManager,
      settings,
      getNavigationVisibleArea,
    })

    /**
     * A user navigation, in order:
     * 1. The entry as asked for.
     * 2. What its target tells of where it goes. No other step reads the
     *    target.
     * 3. The item it goes to, from its position when the target named none.
     * 4. Where the target went in that item, which the snap works from.
     * 5. The item's layout, for restorations to tell what changed since.
     * 6. Its position kept within the spine, or the item start when the
     *    target gave none.
     * 7. The page it snaps to, unless the target gave an exact position.
     * 8. Where it landed in its item.
     * 9. Its anchor.
     */
    const navigationFromUser$ = userNavigation$
      .pipe(
        withLatestFrom(this.navigationSubject),
        mapUserNavigationToInternal,
        withResolvedTarget({ resolvers: targetResolvers }),
        withSpineItem({
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
        withSnappedPosition({
          navigationResolver,
          settings,
          spine,
          isUserInteractionLocked$,
        }),
        withSpineItemPosition({
          spineItemsManager: spine.spineItemsManager,
          spineLocator: spine.locator,
          settings,
          navigationResolver,
        }),
        withAnchor({ spine, cfi: cfiManager }),
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

    /**
     * A restoration re-applies the current navigation, in order:
     * 1. The position it returns to: from its url target, its anchor or its
     *    place in its item in controlled mode, from its place in its item in
     *    scrollable mode.
     * 2. The item, when the navigation has none yet.
     * 3. The item's layout.
     * 4. Where it landed in its item.
     * 5. Its anchor, when it has none yet.
     */
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
      withAnchor({ spine, cfi: cfiManager }),
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

    notifiedNavigationUpdate$.pipe(takeUntil(this.destroy$)).subscribe()
  }

  protected getItemStart(navigation: InternalNavigationEntry) {
    const spineItem = this.spine.spineItemsManager.get(navigation.spineItem)

    return spineItem && this.cfiManager.generateRootCfi(spineItem.item)
  }

  get navigation() {
    return this.navigationSubject.getValue()
  }
}
