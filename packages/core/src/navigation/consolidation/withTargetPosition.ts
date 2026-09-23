import { map, type Observable } from "rxjs"
import type { NavigationResolver } from "../resolvers/NavigationResolver"
import type { InternalNavigationInput } from "../types"

export const withTargetPosition =
  ({ navigationResolver }: { navigationResolver: NavigationResolver }) =>
  <N extends { navigation: InternalNavigationInput }>(
    stream: Observable<N>,
  ): Observable<N> =>
    stream.pipe(
      map((params) =>
        params.navigation.target
          ? {
              ...params,
              navigation: {
                ...params.navigation,
                ...navigationResolver.getNavigationForTarget(
                  params.navigation.target,
                ),
              },
            }
          : params,
      ),
    )
