import { map, type Observable } from "rxjs"
import type { NavigationResolver } from "../resolvers/NavigationResolver"
import type {
  InternalNavigationEntry,
  InternalNavigationInput,
  UserNavigationEntry,
} from "../types"

export const mapUserNavigationToInternal =
  ({ navigationResolver }: { navigationResolver: NavigationResolver }) =>
  (
    stream: Observable<[UserNavigationEntry, InternalNavigationEntry]>,
  ): Observable<{
    navigation: InternalNavigationInput
    previousNavigation: InternalNavigationEntry
  }> => {
    return stream.pipe(
      map(([userNavigation, previousNavigation]) => {
        const navigation: InternalNavigationInput = {
          type: "api",
          meta: {
            triggeredBy: "user",
          },
          /**
           * @important
           * Mint a fresh id for every navigation request, even when the
           * resolved position ends up identical to the current one (e.g. a
           * page turn clamped at a book boundary, or an explicit
           * `goToCfi(currentCfi)`). Downstream `navigation$` keys
           * `distinctUntilChanged` on `id` so consumers can observe every
           * navigation request as a discrete event — including no-op ones
           * that don't move the viewport. Restoration / pagination cycles
           * deliberately preserve the existing id and stay deduplicated.
           */
          id: Symbol(crypto.randomUUID()),
          animation: "turn",
          ...userNavigation,
          /**
           * Snapshot the original user request before the resolver clamps
           * `position` below. Downstream consumers (e.g. boundary detection)
           * compare the requested vs. resolved position to know whether the
           * request was pushed past a spine edge.
           */
          requestedNavigation: { ...userNavigation },
          /**
           * @important
           * The navigator owns clamping. Callers (manual page-turn, gesture
           * recognizers, programmatic `navigate(...)`, etc.) are free to
           * pass any coordinate — including overshoots past the spine — and
           * the resolved `position` is guaranteed to be renderable in the
           * current viewport (viewport rectangle fits inside the spine).
           *
           * Use `clampPositionToFitViewportInSpine` rather than the lighter
           * `clampPositionWithinSpineBounds`: the latter only ensures the
           * point itself is inside the spine, which lets the viewport spill
           * past the end by `~viewportSize` and causes the navigator's
           * stored position to diverge from where the DOM scroll actually
           * lands in scrollable mode.
           */
          position: userNavigation.position
            ? navigationResolver.clampPositionToFitViewportInSpine(
                userNavigation.position,
              )
            : undefined,
        }

        return {
          previousNavigation,
          navigation,
        }
      }),
    )
  }
