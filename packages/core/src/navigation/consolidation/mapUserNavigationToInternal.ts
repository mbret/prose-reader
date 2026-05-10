import { map, type Observable } from "rxjs"
import type { NavigationResolver } from "../resolvers/NavigationResolver"
import type {
  InternalNavigationEntry,
  InternalNavigationInput,
  NavigationVisibleArea,
  UserNavigationEntry,
} from "../types"

export const mapUserNavigationToInternal =
  ({
    navigationResolver,
    getNavigationVisibleArea,
  }: {
    navigationResolver: NavigationResolver
    getNavigationVisibleArea: () => NavigationVisibleArea
  }) =>
  (
    stream: Observable<[UserNavigationEntry, InternalNavigationEntry]>,
  ): Observable<{
    navigation: InternalNavigationInput
    previousNavigation: InternalNavigationEntry
  }> => {
    return stream.pipe(
      map(([userNavigation, previousNavigation]) => {
        const requestedPosition = userNavigation.position
        const visibleArea = requestedPosition
          ? getNavigationVisibleArea()
          : undefined
        const position =
          requestedPosition && visibleArea
            ? navigationResolver.clampPositionInSpine(
                requestedPosition,
                visibleArea,
              )
            : undefined

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
          requestedPosition,
          requestedVisibleArea: visibleArea,
          // Clamp the full viewport rectangle, not just the top-left point:
          // a point-only clamp lets the viewport spill past the end by
          // `~viewportSize` and the stored position diverges from where the
          // DOM scroll actually lands in scrollable mode.
          position,
        }

        return {
          previousNavigation,
          navigation,
        }
      }),
    )
  }
