import { combineLatest, Subject } from "rxjs"
import { distinctUntilChanged, map, shareReplay } from "rxjs/operators"
import type { Context } from "../context/Context"
import type { HookManager } from "../hooks/HookManager"
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
   * Allow automatic restoration to happens.
   * - correction of position
   * - restoration of position
   */
  const restorationLocker = new Locker()
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
    restorationLocker.isLocked$,
  )

  const navigationState$ = combineLatest([
    controlledNavigationController.isNavigating$,
    scrollNavigationController.isNavigating$,
    restorationLocker.isLocked$,
    internalNavigator.locker.isLocked$,
  ]).pipe(
    map((states) => (states.some((isLocked) => isLocked) ? `busy` : `free`)),
    distinctUntilChanged(),
    shareReplay(1),
  )

  const navigate = (to: UserNavigationEntry) => {
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
    locker: restorationLocker,
    navigationState$,
    navigate,
    /**
     * Prevent further navigation until the lock is released.
     * Useful if you want to start navigation by panning for example.
     */
    lock() {
      return restorationLocker.lock()
    },
    navigationResolver: navigationResolver,
    navigation$: internalNavigator.navigation$,
  }
}

export type Navigator = ReturnType<typeof createNavigator>
