import { map, type Observable } from "rxjs"
import type { InternalNavigationInput } from "../InternalNavigator"
import type { NavigationResolver } from "../resolvers/NavigationResolver"

type Navigation = {
  navigation: InternalNavigationInput
}

export const withUrlInfo =
  ({ navigationResolver }: { navigationResolver: NavigationResolver }) =>
  <N extends Navigation>(stream: Observable<N>): Observable<N> => {
    return stream.pipe(
      map((params) => {
        if (params.navigation.url) {
          const result = navigationResolver.getNavigationForUrl(
            params.navigation.url,
          )

          if (result) {
            return {
              ...params,
              navigation: {
                ...params.navigation,
                position: result.position,
                spineItem: result.spineItemId,
              },
            } as N
          }
        }

        return params
      }),
    )
  }
