import { type Observable, map } from "rxjs"
import { SpinePosition } from "../../spine/types"
import type {
  InternalNavigationEntry,
  InternalNavigationInput,
  UserNavigationEntry,
} from "../types"

export const mapUserNavigationToInternal = (
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
        position: userNavigation.position
          ? SpinePosition.from(userNavigation.position)
          : undefined,
      }

      return {
        previousNavigation,
        navigation,
      }
    }),
  )
}
