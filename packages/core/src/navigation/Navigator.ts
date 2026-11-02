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
import type { SpinePosition, UnboundSpinePosition } from "../spine/types"
import { ViewportSlicePosition } from "../viewport/types"
import type { Viewport } from "../viewport/Viewport"
import { ControlledNavigationController } from "./controllers/ControlledNavigationController"
import { ScrollNavigationController } from "./controllers/ScrollNavigationController"
import { InternalNavigator } from "./InternalNavigator"
import { Locker } from "./Locker"
import { createNavigationResolver } from "./resolvers/NavigationResolver"
import type {
  NavigationModeController,
  NavigationTarget,
  UserNavigationEntry,
} from "./types"

export const createNavigator = ({
  spineItemsManager,
  context,
  hookManager,
  spine,
  settings,
  viewport,
  cfi,
  target,
}: {
  cfi: CfiManager
  spineItemsManager: SpineItemsManager
  context: Context
  hookManager: HookManager
  spine: Spine
  settings: ReaderSettingsManager
  viewport: Viewport
  /** Where the reader opens, the start of the book when omitted. */
  target?: NavigationTarget
}) => {
  const userExplicitNavigationSubject = new Subject<UserNavigationEntry>()
  const userNavigation$ = userExplicitNavigationSubject.asObservable()
  const navigationLock = new Locker()
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

  /**
   * The part of the spine the screen shows while the navigation is at
   * `position`, zoom included: the relative viewport, centered on the area
   * the navigation shows there.
   *
   * Paginated, the navigation shows the absolute viewport, and a zoom scales
   * the viewport around its center without moving the navigation. Scrolled,
   * the navigation is the top of the screen at any scale, and shows the
   * relative viewport from there: a zoom scrolls the book to keep its
   * center, which moves the navigation instead.
   */
  const getVisibleSlice = (position: SpinePosition | UnboundSpinePosition) => {
    const navigationVisibleArea =
      getActiveNavigationModeController().getNavigationVisibleArea()
    const { width, height } = viewport.relativeViewport

    return ViewportSlicePosition.from({
      x: position.x + (navigationVisibleArea.width - width) / 2,
      y: position.y + (navigationVisibleArea.height - height) / 2,
      width,
      height,
    })
  }

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
    navigationLock.isLocked$,
    target,
  )

  const navigationState$ = combineLatest([
    ...navigationModeControllers.map((controller) => controller.isNavigating$),
    navigationLock.isLocked$,
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
    /** Holds the navigation for a pan, and returns its release. */
    lock: () => navigationLock.lock(),
    /** Whether a `lock()` is held. */
    isLocked$: navigationLock.isLocked$,
    navigationResolver: navigationResolver,
    /** Every navigation as it happens, restorations included. */
    navigation$: internalNavigator.navigation$,
    /**
     * The latest navigation, and whether it holds on the current layout:
     * whether its position and the pages agree. Completes when the reader is
     * destroyed.
     */
    navigationAgainstCurrentLayout$:
      internalNavigator.navigationAgainstCurrentLayout$,
    position$,
    /** Where the reader is in the book: the cfi to save and reopen at. */
    readingPosition$: internalNavigator.readingPosition$,
    getVisibleSlice,
  }
}

export type Navigator = ReturnType<typeof createNavigator>
