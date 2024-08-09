import { map, Observable } from "rxjs"
import { InternalNavigationInput } from "../InternalNavigator"
import { NavigationResolver } from "../resolvers/NavigationResolver"

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
