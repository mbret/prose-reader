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
  share,
  shareReplay,
  skipUntil,
  switchMap,
  take,
  takeUntil,
  tap,
  withLatestFrom,
} from "rxjs"
import type { CfiManager } from "../cfi"
import type { Context } from "../context/Context"
import { getSpineItemProgression } from "../pagination/progression"
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
  InternalNavigationEntry,
  NavigationModeController,
  NavigationTarget,
  ReadingPosition,
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
   * finds, with its progression. Until the page a navigation goes to is laid
   * out it has neither, and this is the start of the item the navigation goes
   * to, the only place a cfi can name in content that is not laid out. It only
   * moves when the reader navigates, and once when such a navigation finds its
   * page: a relayout reflows the page around it without changing it. A
   * navigation whose target names nothing in the book, such as a malformed
   * cfi, is ignored, and leaves it where it was.
   */
  public readonly readingPosition$: Observable<ReadingPosition> =
    this.navigationSubject.pipe(
      map((navigation) => this.getReadingPosition(navigation)),
      filter(isDefined),
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
     * While held, automatic position adjustments (correction, restoration)
     * are deferred so they don't fight the user's direct manipulation.
     */
    protected isUserInteractionLocked$: Observable<boolean>,
    /** Where the reader opens, the start of the book by default. */
    initialTarget?: NavigationTarget,
  ) {
    super()

    const getNavigationVisibleArea = () =>
      getActiveNavigationModeController().getNavigationVisibleArea()

    const targetResolvers = createTargetResolvers({
      navigationResolver,
      cfi: cfiManager,
      settings,
      spineItemsManager: spine.spineItemsManager,
      getNavigationVisibleArea,
    })

    const isInBook = (target: NavigationTarget) =>
      isTargetInBook(target, {
        cfi: cfiManager,
        spineItemsManager: spine.spineItemsManager,
      })

    /**
     * A navigation whose target names nothing in the book, such as a malformed
     * cfi, or a cfi or a spine item the book does not have, is ignored: the
     * reader has nowhere to go, and stays where it is. It is dropped before
     * anything hears of it, so it does not replace the first navigation
     * either.
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
        withLatestFrom(this.navigationSubject),
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
          isUserInteractionLocked$,
        }),
        withSpineItemPosition({
          spineItemsManager: spine.spineItemsManager,
          spineLocator: spine.locator,
          settings,
          navigationResolver,
        }),
        withAnchor({ spine, cfi: cfiManager, context }),
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
      // Nothing to restore before the first navigation.
      skipUntil(navigationFromUser$),
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

  protected getReadingPosition(
    navigation: InternalNavigationEntry,
  ): ReadingPosition | undefined {
    const spineItem = this.spine.spineItemsManager.get(navigation.spineItem)

    if (!spineItem) return undefined

    return {
      cfi: navigation.anchor ?? this.cfiManager.generateRootCfi(spineItem.item),
      percentageEstimateOfBook:
        navigation.anchorPageStartProgression ??
        getSpineItemProgression(this.context.manifest, spineItem.index).start,
    }
  }

  get navigation() {
    return this.navigationSubject.getValue()
  }
}
