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
          // Fresh id per request so `navigation$` consumers see every user
          // call as a discrete event, including no-ops at a boundary.
          // Restoration / pagination cycles deliberately preserve the
          // existing id to stay deduplicated.
          id: Symbol("user"),
          animation: "turn",
          ...userNavigation,
          requestedPosition: userNavigation.position,
          // Clamp the full viewport rectangle, not just the top-left point:
          // a point-only clamp lets the viewport spill past the end by
          // `~viewportSize` and the stored position diverges from where the
          // DOM scroll actually lands in scrollable mode.
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
