import { map, type Observable } from "rxjs"
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
        const { target } = params.navigation

        if (target.type === "cfi" && target.value) {
          const position = navigationResolver.getNavigationForCfi(target.value)

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
