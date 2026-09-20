import { isShallowEqual } from "@prose-reader/shared"
import {
  combineLatest,
  distinctUntilChanged,
  map,
  merge,
  of,
  Subject,
  shareReplay,
  startWith,
  switchMap,
  takeUntil,
  timer,
} from "rxjs"
import type { CfiManager } from "../cfi"
import type { Context } from "../context/Context"
import type { HookManager } from "../hooks/HookManager"
import { Report } from "../report"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import type { Spine } from "../spine/Spine"
import type { SpineItemsManager } from "../spine/SpineItemsManager"
import type { Viewport } from "../viewport/Viewport"
import { ControlledNavigationController } from "./controllers/ControlledNavigationController"
import { ScrollNavigationController } from "./controllers/ScrollNavigationController"
import { InternalNavigator } from "./InternalNavigator"
import { Locker } from "./Locker"
import type { NavigationState } from "./operators"
import { createNavigationResolver } from "./resolvers/NavigationResolver"
import type { NavigationModeController, UserNavigationEntry } from "./types"

export const createNavigator = ({
  spineItemsManager,
  context,
  hookManager,
  spine,
  settings,
  viewport,
  cfi,
}: {
  cfi: CfiManager
  spineItemsManager: SpineItemsManager
  context: Context
  hookManager: HookManager
  spine: Spine
  settings: ReaderSettingsManager
  viewport: Viewport
}) => {
  const destroy$ = new Subject<void>()
  const userExplicitNavigationSubject = new Subject<UserNavigationEntry>()
  const userNavigation$ = userExplicitNavigationSubject.asObservable()
  const userInteractionLock = new Locker()
  const cfiManager = cfi
  const navigationResolver = createNavigationResolver({
    cfi: cfiManager,
    context,
    settings,
    spineItemsManager,
    locator: spine.locator,
    spine,
    viewport,
  })

  const controlledNavigationController = new ControlledNavigationController(
    settings,
    hookManager,
    context,
    spine,
    viewport,
  )

  const scrollNavigationController = new ScrollNavigationController(
    viewport,
    settings,
    hookManager,
    spine,
    context,
  )

  const navigationModeControllers: NavigationModeController[] = [
    scrollNavigationController,
    controlledNavigationController,
  ]

  const getActiveNavigationModeController = () =>
    navigationModeControllers.find((controller) => controller.isActive()) ??
    controlledNavigationController

  const navigationModeLayout$ = merge(
    ...navigationModeControllers.flatMap((controller) =>
      controller.layout$ ? [controller.layout$] : [],
    ),
  )

  const internalNavigator = new InternalNavigator(
    settings,
    context,
    userNavigation$,
    getActiveNavigationModeController,
    navigationModeLayout$,
    navigationResolver,
    spine,
    viewport,
    cfiManager,
    userInteractionLock.isLocked$,
  )

  const activity$ = combineLatest([
    ...navigationModeControllers.map((controller) => controller.isNavigating$),
    userInteractionLock.isLocked$,
    internalNavigator.locker.isLocked$,
  ]).pipe(
    map((states) => (states.some((isLocked) => isLocked) ? `busy` : `free`)),
    distinctUntilChanged(),
  )

  /**
   * Resolved viewport position, deduped on shallow equality. Re-emits only
   * when the position effectively changes — collapses the
   * per-`navigate(...)` re-emissions that `navigation$` produces.
   */
  const position$ = internalNavigator.navigation$.pipe(
    map(({ position }) => position),
    distinctUntilChanged(isShallowEqual),
    shareReplay(1),
  )

  const navigationState$ = combineLatest([
    activity$,
    internalNavigator.navigationSubject,
  ]).pipe(
    switchMap(([activity, navigation]) => {
      const item = spineItemsManager.get(navigation.spineItem)
      return (item?.isReady$ ?? of(false)).pipe(
        switchMap((ready) => {
          const unsettled: NavigationState = { activity, isSettled: false }
          if (activity === "busy" || !ready) return of(unsettled)

          // Publish activity immediately so pagination can run. Defer settlement
          // until synchronous restoration and pagination notifications finish;
          // any new navigation, lock, or readiness change cancels this timer.
          return timer(0).pipe(
            map((): NavigationState => ({ activity, isSettled: true })),
            startWith(unsettled),
          )
        }),
      )
    }),
    distinctUntilChanged(isShallowEqual),
    takeUntil(destroy$),
    shareReplay({ bufferSize: 1, refCount: false }),
  )
  // Own the state stream for the navigator's lifetime, independent of consumers.
  navigationState$.subscribe()

  const navigate = (to: UserNavigationEntry) => {
    Report.info("User navigation", to)

    // A request is navigation work even if the controller keeps the same position.
    const unlock = internalNavigator.locker.lock()
    try {
      userExplicitNavigationSubject.next(to)
    } finally {
      unlock()
    }
  }

  const destroy = () => {
    destroy$.next()
    destroy$.complete()
    userExplicitNavigationSubject.complete()
    navigationModeControllers.forEach((controller) => {
      controller.destroy()
    })
    internalNavigator.destroy()
  }

  return {
    destroy,
    settled$: navigationState$.pipe(
      map((state) => state.isSettled),
      distinctUntilChanged(),
    ),
    getNavigation: () => internalNavigator.navigation,
    internalNavigator,
    scrollNavigationController,
    controlledNavigationController,
    navigationState$,
    navigate,
    /**
     * Prevent further navigation until the lock is released.
     * Useful if you want to start navigation by panning for example.
     */
    lock: () => userInteractionLock.lock(),
    /**
     * `true` while a `lock()` is held. Releases as soon as the user lets
     * go — does NOT include in-flight viewport animation or the
     * unlock-driven restoration cycle (use `navigationState$` for that).
     */
    isLocked$: userInteractionLock.isLocked$,
    navigationResolver: navigationResolver,
    navigation$: internalNavigator.navigation$,
    position$,
  }
}

export type Navigator = ReturnType<typeof createNavigator>
