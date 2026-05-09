import { isShallowEqual } from "@prose-reader/shared"
import {
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  Subject,
  shareReplay,
} from "rxjs"
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
import type { UserNavigationEntry } from "./types"

export const createNavigator = ({
  spineItemsManager,
  context,
  hookManager,
  spine,
  settings,
  viewport,
}: {
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
  const navigationResolver = createNavigationResolver({
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

  const internalNavigator = new InternalNavigator(
    settings,
    context,
    userNavigation$,
    controlledNavigationController,
    scrollNavigationController,
    navigationResolver,
    spine,
    viewport,
    userInteractionLock.isLocked$,
  )

  const navigationState$ = combineLatest([
    controlledNavigationController.isNavigating$,
    scrollNavigationController.isNavigating$,
    userInteractionLock.isLocked$,
    internalNavigator.locker.isLocked$,
  ]).pipe(
    map((states) => (states.some((isLocked) => isLocked) ? `busy` : `free`)),
    distinctUntilChanged(),
    shareReplay(1),
  )

  /**
   * Emits navigation entries once the navigator pipeline has fully settled
   * (`navigationState$ === "free"`): no held lock, no in-flight viewport
   * animation, no pending unlock-driven restoration.
   */
  const settledNavigation$ = combineLatest([
    internalNavigator.navigation$,
    navigationState$,
  ]).pipe(
    filter(([, state]) => state === "free"),
    map(([navigation]) => navigation),
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

  /** {@link position$} gated on {@link settledNavigation$}. */
  const settledPosition$ = settledNavigation$.pipe(
    map(({ position }) => position),
    distinctUntilChanged(isShallowEqual),
    shareReplay(1),
  )

  const navigate = (to: UserNavigationEntry) => {
    Report.info("User navigation", to)

    userExplicitNavigationSubject.next(to)
  }

  const destroy = () => {
    controlledNavigationController.destroy()
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
    settledNavigation$,
    position$,
    settledPosition$,
  }
}

export type Navigator = ReturnType<typeof createNavigator>
