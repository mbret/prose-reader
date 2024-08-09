import { map, Observable } from "rxjs"
import { UserNavigationEntry } from "../UserNavigator"
import {
  InternalNavigationEntry,
  InternalNavigationInput,
} from "../InternalNavigator"

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
      }

      return {
        previousNavigation,
        navigation,
      }
    }),
  )
}
