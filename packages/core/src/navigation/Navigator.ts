import { Context } from "../context/Context"
import { SpineItemsManager } from "../spine/SpineItemsManager"
import { createNavigationResolver } from "./resolvers/NavigationResolver"
import {
  BehaviorSubject,
  combineLatest,
  fromEvent,
  merge,
  of,
  timer,
} from "rxjs"
import {
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  startWith,
  switchMap,
  withLatestFrom,
} from "rxjs/operators"
import { Spine } from "../spine/Spine"
import { isDefined } from "../utils/isDefined"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { HookManager } from "../hooks/HookManager"
import { noopElement } from "../utils/dom"
import { ViewportNavigator } from "./viewport/ViewportNavigator"
import { UserNavigator } from "./UserNavigator"
import { InternalNavigator } from "./InternalNavigator"
import { HTML_PREFIX } from "../constants"
import { SpineItemsObserver } from "../spine/SpineItemsObserver"

export const createNavigator = ({
  spineItemsManager,
  spineItemsObserver,
  context,
  parentElement$,
  hookManager,
  spine,
  settings,
}: {
  spineItemsManager: SpineItemsManager
  spineItemsObserver: SpineItemsObserver
  context: Context
  parentElement$: BehaviorSubject<HTMLElement | undefined>
  hookManager: HookManager
  spine: Spine
  settings: ReaderSettingsManager
}) => {
  const element$ = new BehaviorSubject<HTMLElement>(noopElement())
  const navigationResolver = createNavigationResolver({
    context,
    settings,
    spineItemsManager,
    locator: spine.locator,
  })

  const viewportNavigator = new ViewportNavigator(
    settings,
    element$,
    hookManager,
    context,
    spine,
  )

  // might be a bit overkill but we want to be sure of sure
  const isSpineScrolling$ = merge(
    spine.elementResize$,
    spine.element$.pipe(switchMap((element) => fromEvent(element, "scroll"))),
    spineItemsObserver.itemResize$,
  ).pipe(
    switchMap(() => merge(of(true), timer(5).pipe(map(() => false)))),
    startWith(false),
  )

  const scrollHappeningFromBrowser$ = combineLatest([
    isSpineScrolling$,
    viewportNavigator.isScrolling$,
  ]).pipe(
    map(
      ([spineScrolling, viewportScrolling]) =>
        spineScrolling || viewportScrolling,
    ),
    shareReplay(1),
  )

  const userNavigator = new UserNavigator(
    settings,
    element$,
    context,
    scrollHappeningFromBrowser$,
  )

  const internalNavigator = new InternalNavigator(
    settings,
    context,
    userNavigator.navigation$,
    viewportNavigator,
    navigationResolver,
    spineItemsManager,
    spine.locator,
    element$,
    userNavigator.locker.isLocked$,
  )

  const viewportState$ = combineLatest([
    viewportNavigator.isNavigating$,
    userNavigator.locker.isLocked$,
    internalNavigator.locker.isLocked$,
  ]).pipe(
    map((states) => (states.some((isLocked) => isLocked) ? `busy` : `free`)),
    distinctUntilChanged(),
    shareReplay(1),
  )

  const parentElementSub = parentElement$
    .pipe(filter(isDefined), withLatestFrom(spine.element$))
    .subscribe(([parentElement, spineElement]) => {
      const element: HTMLElement =
        parentElement.ownerDocument.createElement(`div`)
      element.style.cssText = `
      height: 100%;
      position: relative;
    `
      element.className = `${HTML_PREFIX}-navigator`

      /**
       * Beware of this property, do not try to change anything else or remove it.
       * This is early forced optimization and is used for this specific context.
       * @see https://developer.mozilla.org/en-US/docs/Web/CSS/will-change
       *
       * @important
       * This seems to be responsible for the screen freeze issue
       */
      // element.style.willChange = `transform`
      // element.style.transformOrigin = `0 0`

      hookManager.execute("navigator.onBeforeContainerCreated", undefined, {
        element,
      })

      element.appendChild(spineElement)

      parentElement.appendChild(element)

      element$.next(element)
    })

  const destroy = () => {
    userNavigator.destroy()
    viewportNavigator.destroy()
    internalNavigator.destroy()
    parentElementSub.unsubscribe()
  }

  return {
    destroy,
    getNavigation: () => internalNavigator.navigation,
    internalNavigator,
    viewportNavigator,
    element$,
    isLocked$: userNavigator.locker.isLocked$,
    viewportState$,
    navigate: userNavigator.navigate.bind(userNavigator),
    lock() {
      return userNavigator.locker.lock()
    },
    navigationResolver: navigationResolver,
    navigation$: internalNavigator.navigation$,
    getElement: () => element$.getValue(),
  }
}

export type Navigator = ReturnType<typeof createNavigator>
