import { isShallowEqual } from "@prose-reader/shared"
import {
  combineLatest,
  distinctUntilChanged,
  map,
  merge,
  Subject,
  shareReplay,
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

  const navigationState$ = combineLatest([
    ...navigationModeControllers.map((controller) => controller.isNavigating$),
    userInteractionLock.isLocked$,
    internalNavigator.locker.isLocked$,
  ]).pipe(
    map((states) => (states.some((isLocked) => isLocked) ? `busy` : `free`)),
    distinctUntilChanged(),
    shareReplay(1),
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

  const navigate = (to: UserNavigationEntry) => {
    Report.info("User navigation", to)

    userExplicitNavigationSubject.next(to)
  }

  const destroy = () => {
    navigationModeControllers.forEach((controller) => {
      controller.destroy()
    })
    internalNavigator.destroy()
  }

  return {
    destroy,
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
