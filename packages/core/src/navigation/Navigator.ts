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
import { ViewportNavigator } from "./controllers/ControlledController"
import { ScrollController } from "./controllers/ScrollController"
import { createNavigationResolver } from "./resolvers/NavigationResolver"

export const createNavigator = ({
  spineItemsManager,
  context,
  parentElement$,
  hookManager,
  spine,
  settings,
  viewport,
}: {
  spineItemsManager: SpineItemsManager
  context: Context
  parentElement$: BehaviorSubject<HTMLElement | undefined>
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

  const controlledController = new ViewportNavigator(
    settings,
    hookManager,
    context,
    spine,
    viewport,
  )

  const scrollController = new ScrollController(
    viewport,
    settings,
    hookManager,
    parentElement$,
    spine,
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
    scrollController.isScrolling$,
  ]).pipe(
    map(
      ([spineScrolling, viewportScrolling]) =>
        spineScrolling || viewportScrolling,
    ),
    shareReplay(1),
  )

  const userNavigator = new UserNavigator(
    settings,
    scrollController.element$,
    context,
    scrollHappeningFromBrowser$,
    spine,
  )

  const internalNavigator = new InternalNavigator(
    settings,
    context,
    userNavigator.navigation$,
    controlledController,
    scrollController,
    navigationResolver,
    spine,
    userNavigator.locker.isLocked$,
  )

  const viewportState$ = combineLatest([
    controlledController.isNavigating$,
    scrollController.isNavigating$,
    userNavigator.locker.isLocked$,
    internalNavigator.locker.isLocked$,
  ]).pipe(
    map((states) => (states.some((isLocked) => isLocked) ? `busy` : `free`)),
    distinctUntilChanged(),
    shareReplay(1),
  )

  const destroy = () => {
    userNavigator.destroy()
    controlledController.destroy()
    internalNavigator.destroy()
  }

  return {
    destroy,
    getNavigation: () => internalNavigator.navigation,
    internalNavigator,
    scrollController,
    controlledController,
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
