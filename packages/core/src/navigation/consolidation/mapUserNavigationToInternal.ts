import { map, type Observable } from "rxjs"
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
        // Fresh id per request so `navigation$` consumers see every user
        // call as a discrete event, including no-ops at a boundary.
        // Restoration / pagination cycles deliberately preserve the
        // existing id to stay deduplicated.
        id: Symbol("user"),
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
