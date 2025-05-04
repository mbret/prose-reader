import { type Observable, map } from "rxjs"
import type { PaginationInfo } from "../../pagination"
import type { InternalNavigationEntry } from "../types"

type Navigation = {
  navigation: InternalNavigationEntry
  pagination: PaginationInfo
}

export const withPaginationInfo =
  () =>
  <N extends Navigation>(stream: Observable<N>): Observable<N> => {
    return stream.pipe(
      map(({ navigation, pagination, ...rest }) => {
        return {
          navigation: {
            ...navigation,
            paginationBeginCfi: pagination.beginCfi,
          },
          ...rest,
        } as N
      }),
    )
  }
