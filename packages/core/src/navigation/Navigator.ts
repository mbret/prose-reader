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
  /**
   * Tracks whether a user-driven hold is currently active on the navigator
   * (pan, throttle, scroll-debounce, …). While held, the engine defers
   * automatic adjustments such as restoration so they don't fight the user's
   * direct manipulation; once released, those adjustments resume.
   */
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
   *
   * This is the canonical "do work after navigation" stream. Per-frame
   * pan/throttle emissions and mid-animation states are filtered out at the
   * source.
   *
   * Each emission corresponds to a distinct navigation entry from
   * `navigation$` (already deduped on `(id, position, requestedPosition)`).
   * Consumers that need stricter dedup semantics (e.g. ignore changes in
   * `requestedPosition`, collapse on `position` only) should layer their
   * own `distinctUntilChanged` on top.
   *
   * Use this instead of subscribing to `navigation$` directly when you only
   * care about navigation events whose viewport effect has finished.
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
   * Deduped projection of `navigation$.position`. Re-emits only when the
   * resolved viewport position effectively changes — collapses the
   * per-`navigate(...)` re-emissions that `navigation$` produces for
   * boundary-detection purposes.
   *
   * Use this when your consumer's behavior is purely position-driven
   * (e.g. spine load/unload, scroll sync). Use `navigation$` when you need
   * to observe every navigation request as a discrete event (e.g.
   * boundary detection on `requestedPosition`).
   */
  const position$ = internalNavigator.navigation$.pipe(
    map(({ position }) => position),
    distinctUntilChanged(isShallowEqual),
    shareReplay(1),
  )

  /**
   * Deduped projection of `settledNavigation$.position`. Combines the
   * "everything settled" gating of `settledNavigation$` with the
   * position-only dedup of `position$`.
   *
   * Use this for post-settle, position-driven work (e.g. pagination
   * progression updates).
   */
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
     * Emits whether a user-driven hold is currently active on the navigator
     * (pan, throttle, scroll-debounce, …) — anything acquired via `lock()`.
     *
     * Distinct from `navigationState$`:
     * - `isLocked$` does NOT include in-flight viewport animation, so it
     *   releases as soon as the user lets go.
     * - `navigationState$ === "free"` waits for everything to settle,
     *   including animation and the unlock-driven restoration cycle.
     *
     * Use `isLocked$` for "defer until the user is done interacting" (e.g.
     * heavier pagination updates). Use `navigationState$` for "everything has
     * stopped" (e.g. boundary reporting, post-navigation calculations).
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
