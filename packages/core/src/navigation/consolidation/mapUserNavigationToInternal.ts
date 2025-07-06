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
          id: Symbol(),
          animation: "turn",
          ...userNavigation,
          /**
           * @important
           * For now we do not allow out of bounds positions. (this happens when scroll mode with a zoom out).
           * Although it's technically possible to be out of bounds, in terms of navigation and the rest of the app
           * it's hard to predict what will happens with negative x/y. spine item will not be retrieved, the spine position might
           * not be within anything (although the viewport slice is).
           *
           * Spine position should ideally be within the spine (even when viewport is scaled down/up). That's why we have viewport
           * on top of the spine.
           *
           * For now having things centered (negative x) on zoom out in scroll mode can be achieved with transform origin for example.
           * This "limitation" is here at the moment to avoid unexpected behaviors.
           */
          position: userNavigation.position
            ? navigationResolver.fromOutOfBoundsSpinePosition(
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
