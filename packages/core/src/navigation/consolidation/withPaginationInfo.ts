import { map, Observable } from "rxjs"
import { InternalNavigationEntry } from "../InternalNavigator"
import { PaginationInfo } from "../../pagination/Pagination"

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
