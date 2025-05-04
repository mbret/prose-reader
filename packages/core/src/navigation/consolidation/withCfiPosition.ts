import { type Observable, map } from "rxjs"
import type { NavigationResolver } from "../resolvers/NavigationResolver"
import type { InternalNavigationInput } from "../types"

type Navigation = {
  navigation: InternalNavigationInput
}

export const withCfiPosition =
  ({ navigationResolver }: { navigationResolver: NavigationResolver }) =>
  <N extends Navigation>(stream: Observable<N>): Observable<N> => {
    return stream.pipe(
      map((params) => {
        if (params.navigation.cfi) {
          const position = navigationResolver.getNavigationForCfi(
            params.navigation.cfi,
          )

          if (position) {
            return {
              ...params,
              navigation: {
                ...params.navigation,
                position,
              },
            } as N
          }
        }

        return params
      }),
    )
  }
