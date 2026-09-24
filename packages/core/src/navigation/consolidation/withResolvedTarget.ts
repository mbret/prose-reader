import { map, type Observable } from "rxjs"
import type {
  NavigationTargetResolvers,
  TargetResolverContext,
} from "../targets/types"
import type {
  InternalNavigationEntry,
  InternalNavigationInput,
  NavigationTarget,
  NavigationTargetType,
} from "../types"

type Navigation = {
  navigation: InternalNavigationInput
  previousNavigation: InternalNavigationEntry
}

const resolveTarget = <Type extends NavigationTargetType>(
  resolvers: NavigationTargetResolvers,
  target: NavigationTarget<Type>,
  context: TargetResolverContext,
) => resolvers[target.type](target.value, context)

/**
 * The only consolidation step that reads the navigation's target.
 */
export const withResolvedTarget =
  ({ resolvers }: { resolvers: NavigationTargetResolvers }) =>
  <N extends Navigation>(stream: Observable<N>) =>
    stream.pipe(
      map((params) => {
        const { isExact, ...resolution } = resolveTarget(
          resolvers,
          params.navigation.target,
          { previousNavigation: params.previousNavigation },
        )

        return {
          ...params,
          navigation: { ...params.navigation, ...resolution },
          isExact,
        }
      }),
    )
