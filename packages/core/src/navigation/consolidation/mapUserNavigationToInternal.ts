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
        const { target } = userNavigation
        const requestedPosition =
          target.type === "position" ? target.value : undefined
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
          // A target naming its item is already resolved to it; the other
          // types are resolved by the consolidation steps.
          spineItem: target.type === "spineItem" ? target.value : undefined,
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
