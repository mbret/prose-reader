import {
  filter,
  first,
  type MonoTypeOperatorFunction,
  map,
  type Observable,
  skip,
  switchMap,
  takeUntil,
} from "rxjs"
import type { Navigation } from "./types"

export type NavigationState = "busy" | "free"

export type NavigationSignals = {
  navigation$: Observable<Navigation>
  navigationState$: Observable<NavigationState>
}

export const waitForNavigationSettled =
  <T>(
    navigationState$: Observable<NavigationState>,
  ): MonoTypeOperatorFunction<T> =>
  (source) =>
    source.pipe(
      switchMap((value) =>
        navigationState$.pipe(
          filter((state) => state === "free"),
          first(),
          map(() => value),
        ),
      ),
    )

/**
 * Emits each navigation after the navigator has returned to a free state.
 *
 * This is intentionally a utility instead of a `Navigator` property: consumers
 * should opt into the timing semantics they need instead of depending on a
 * shared replay cache.
 */
export const observeSettledNavigation = ({
  navigation$,
  navigationState$,
}: NavigationSignals): Observable<Navigation> =>
  navigation$.pipe(waitForNavigationSettled(navigationState$))

/**
 * Skips the navigation current at subscription time, then emits once the next
 * navigation has settled.
 */
export const observeNextSettledNavigation = (
  signals: NavigationSignals,
): Observable<Navigation> => observeSettledNavigation(signals).pipe(skip(1))

/**
 * Cancels a source when a later navigation has settled.
 */
export const takeUntilNextNavigationSettled =
  <T>(signals: NavigationSignals): MonoTypeOperatorFunction<T> =>
  (source) =>
    source.pipe(takeUntil(observeNextSettledNavigation(signals)))
