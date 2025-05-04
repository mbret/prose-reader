import {
  type Observable,
  distinctUntilChanged,
  filter,
  first,
  map,
  of,
  switchMap,
  withLatestFrom,
} from "rxjs"
import type { Context } from "../../context/Context"
import type { Spine } from "../../spine/Spine"
import type { InternalNavigationEntry } from "../types"
import { withPaginationInfo } from "./withPaginationInfo"

export const consolidateWithPagination = (
  context: Context,
  navigation$: Observable<InternalNavigationEntry>,
  spine: Spine,
) =>
  context.bridgeEvent.pagination$.pipe(
    withLatestFrom(navigation$),
    filter(
      ([pagination, navigation]) => pagination.navigationId === navigation.id,
    ),
    /**
     * We only register the pagination cfi IF the spine item is ready.
     * Otherwise we might save something incomplete and thus restore
     * the user to an invalid location.
     */
    switchMap(([pagination, navigation]) => {
      const spineItem = spine.spineItemsManager.get(navigation.spineItem)

      return (spineItem?.isReady$.pipe(first()) ?? of(false)).pipe(
        filter((isReady) => isReady),
        map(() => ({
          pagination,
          navigation,
        })),
      )
    }),
    withPaginationInfo(),
    distinctUntilChanged(
      (prev, curr) =>
        prev.navigation.paginationBeginCfi ===
        curr.navigation.paginationBeginCfi,
    ),
    map(
      ({ navigation }) =>
        ({
          ...navigation,
          meta: {
            triggeredBy: "pagination",
          },
        }) satisfies InternalNavigationEntry,
    ),
  )
