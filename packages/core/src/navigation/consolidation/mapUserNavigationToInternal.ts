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
           *
           * @note
           * Has a bug where scaling from < 1 to 1 was creating positive x offset. This is "expected" since on scroll mode the viewport
           * is at the offset 0 at scale 0.2 for eg: then when calculating new scroll delta, we get positive x offset. Anyway, to prevent
           * out of bounds position this should make sure we always stay within an item.
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
