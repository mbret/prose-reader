import { map, type Observable } from "rxjs"
import type { NavigationResolver } from "../resolvers/NavigationResolver"
import type { InternalNavigationInput } from "../types"

type Navigation = {
  navigation: InternalNavigationInput
}

export const withUrlInfo =
  ({ navigationResolver }: { navigationResolver: NavigationResolver }) =>
  <N extends Navigation>(stream: Observable<N>): Observable<N> => {
    return stream.pipe(
      map((params) => {
        const { target } = params.navigation

        if (target.type === "url" && target.value) {
          const result = navigationResolver.getNavigationForUrl(target.value)

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
