import { map, type Observable } from "rxjs"
import type {
  InternalNavigationEntry,
  InternalNavigationInput,
  UserNavigationEntry,
} from "../types"

export const mapUserNavigationToInternal = (
  stream: Observable<[UserNavigationEntry, InternalNavigationEntry, boolean]>,
): Observable<{
  navigation: InternalNavigationInput
  previousNavigation: InternalNavigationEntry
  /**
   * Whether `lock()` is held, as by a pan, the user's scrolling or the app.
   * The navigation is then unfinished: it is not snapped to a page, and lands
   * once the lock is released.
   */
  awaitsLockRelease: boolean
}> => {
  return stream.pipe(
    map(([userNavigation, previousNavigation, awaitsLockRelease]) => {
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
        awaitsLockRelease,
      }
    }),
  )
}
