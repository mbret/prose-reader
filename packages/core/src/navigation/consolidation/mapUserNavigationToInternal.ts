import { type Observable, map } from "rxjs"
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
      }

      return {
        previousNavigation,
        navigation,
      }
    }),
  )
}
