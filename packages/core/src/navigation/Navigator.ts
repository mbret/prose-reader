import {
  type BehaviorSubject,
  combineLatest,
  fromEvent,
  merge,
  timer,
} from "rxjs"
import {
  distinctUntilChanged,
  map,
  shareReplay,
  startWith,
  switchMap,
} from "rxjs/operators"
import type { Context } from "../context/Context"
import type { HookManager } from "../hooks/HookManager"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import type { Spine } from "../spine/Spine"
import type { SpineItemsManager } from "../spine/SpineItemsManager"
import { observeResize } from "../utils/rxjs"
import type { Viewport } from "../viewport/Viewport"
import { InternalNavigator } from "./InternalNavigator"
import { UserNavigator } from "./UserNavigator"
import { ControlledNavigationController } from "./controllers/ControlledNavigationController"
import { ScrollNavigationController } from "./controllers/ScrollNavigationController"
import { createNavigationResolver } from "./resolvers/NavigationResolver"

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
  const navigationResolver = createNavigationResolver({
    context,
    settings,
    spineItemsManager,
    locator: spine.locator,
    spineLayout: spine.spineLayout,
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

  // might be a bit overkill but we want to be sure of sure
  const isSpineScrolling$ = merge(
    spine.element$.pipe(switchMap((element) => observeResize(element))),
    spine.element$.pipe(switchMap((element) => fromEvent(element, "scroll"))),
    spine.spineItemsObserver.itemResize$,
  ).pipe(
    switchMap(() =>
      timer(10).pipe(
        map(() => false),
        startWith(true),
      ),
    ),
    distinctUntilChanged(),
    startWith(false),
  )

  const scrollHappeningFromBrowser$ = combineLatest([
    isSpineScrolling$,
    scrollNavigationController.isScrolling$,
  ]).pipe(
    map(
      ([spineScrolling, viewportScrolling]) =>
        spineScrolling || viewportScrolling,
    ),
    shareReplay(1),
  )

  const userNavigator = new UserNavigator(
    settings,
    scrollNavigationController.element$,
    context,
    scrollHappeningFromBrowser$,
    spine,
  )

  const internalNavigator = new InternalNavigator(
    settings,
    context,
    userNavigator.navigation$,
    controlledNavigationController,
    scrollNavigationController,
    navigationResolver,
    spine,
    userNavigator.locker.isLocked$,
  )

  const viewportState$ = combineLatest([
    controlledNavigationController.isNavigating$,
    scrollNavigationController.isNavigating$,
    userNavigator.locker.isLocked$,
    internalNavigator.locker.isLocked$,
  ]).pipe(
    map((states) => (states.some((isLocked) => isLocked) ? `busy` : `free`)),
    distinctUntilChanged(),
    shareReplay(1),
  )

  const destroy = () => {
    userNavigator.destroy()
    controlledNavigationController.destroy()
    internalNavigator.destroy()
  }

  return {
    destroy,
    getNavigation: () => internalNavigator.navigation,
    internalNavigator,
    scrollNavigationController,
    controlledNavigationController,
    isLocked$: userNavigator.locker.isLocked$,
    viewportState$,
    navigate: userNavigator.navigate.bind(userNavigator),
    lock() {
      return userNavigator.locker.lock()
    },
    navigationResolver: navigationResolver,
    navigation$: internalNavigator.navigation$,
  }
}

export type Navigator = ReturnType<typeof createNavigator>
