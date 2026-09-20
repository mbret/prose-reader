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

export type NavigationState = {
  /** Whether navigation work or a lock is holding the viewport. */
  activity: "busy" | "free"
  /** Whether navigation is ready; the reader includes pagination completion. */
  isSettled: boolean
}

export type NavigationSignals = {
  navigation$: Observable<Navigation>
  navigationState$: Observable<NavigationState>
}

/** Wait for viewport activity to finish, allowing layout and pagination to run. */
export const waitForNavigationFree =
  <T>(
    navigationState$: Observable<NavigationState>,
  ): MonoTypeOperatorFunction<T> =>
  (source) =>
    source.pipe(
      switchMap((value) =>
        navigationState$.pipe(
          filter((state) => state.activity === "free"),
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
export const observeFreeNavigation = ({
  navigation$,
  navigationState$,
}: NavigationSignals): Observable<Navigation> =>
  navigation$.pipe(waitForNavigationFree(navigationState$))

/**
 * Skips the navigation current at subscription time, then emits once the next
 * navigation is free.
 */
export const observeNextFreeNavigation = (
  signals: NavigationSignals,
): Observable<Navigation> => observeFreeNavigation(signals).pipe(skip(1))

/**
 * Cancels a source when a later navigation is free.
 */
export const takeUntilNextFreeNavigation =
  <T>(signals: NavigationSignals): MonoTypeOperatorFunction<T> =>
  (source) =>
    source.pipe(takeUntil(observeNextFreeNavigation(signals)))
